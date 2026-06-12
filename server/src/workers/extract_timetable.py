import sys
import json
import os
import fitz
from dotenv import load_dotenv
import google.generativeai as genai
import tempfile

def extract_with_gemini(pdf_path):
    load_dotenv()
    
    keys_str = os.getenv("GEMINI_API_KEYS")
    if keys_str:
        api_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    else:
        api_keys = [os.getenv("GEMINI_API_KEY")]

    if not api_keys or not api_keys[0]:
        print(json.dumps({"error": "No GEMINI_API_KEYS found"}))
        return

    try:
        # Convert PDF page 0 to an image file temporarily
        doc = fitz.open(pdf_path)
        page = doc[0]
        pix = page.get_pixmap(dpi=200)
        
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        
        pix.save(tmp_path)
    except Exception as e:
        print(json.dumps({"error": f"PDF parsing error: {str(e)}"}))
        return

    prompt = """
        Extract all the information from this timetable image and format it as a valid JSON object.
        Make sure to correctly identify merged cells (e.g., labs spanning multiple periods) and include all metadata, periods, schedule, and the course details table at the bottom.
        
        Look for header metadata in the timetable like: program (e.g. B.Tech, M.Tech, MCA), department (e.g. CSE, ECE), branch (e.g. Computer Science and Engineering), semester number (e.g. 6 for Semester VI), and section (e.g. A, B, or null if not present).
        
        CRITICAL RULES:
        1. If a cell contains multiple rooms separated by a slash (e.g. "219 / 220" or "Lab 1 / Lab 2"), you MUST capture the ENTIRE string exactly as written into the "room" field (e.g. "219 / 220"). DO NOT drop the second room!
        2. You MUST return ONLY a JSON object that STRICTLY follows this exact structure. Do not nest events inside 'Monday', use a flat array or array of days!
        {
          "metadata": {
            "program": "BTECH",
            "department": "CSE",
            "branch": "Computer Science and Engineering",
            "branch_short": "CS",
            "semester_number": 6,
            "section": "A"
          },
          "course_details": [
            { "code": "CS333", "name": "Compiler Design (CD)", "credit": "4", "teacher": "Prof. X" }
          ],
          "schedule": [
            {
              "day": "Monday",
              "events": [
                {
                  "course": "Compiler Design",
                  "course_code": "CS333",
                  "room": "219",
                  "group": "G3",
                  "start_period": "I",
                  "end_period": "I"
                }
              ]
            }
          ]
        }
        """

    for idx, key in enumerate(api_keys):
        genai.configure(api_key=key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        try:
            gemini_file = genai.upload_file(tmp_path, mime_type="image/png")
            response = model.generate_content(
                [prompt, gemini_file],
                generation_config={"response_mime_type": "application/json"}
            )
            
            # Parse output to ensure it's valid, then print for Node.js
            timetable_data = json.loads(response.text)
            print(json.dumps(timetable_data, ensure_ascii=False))
            
            # Cleanup
            os.remove(tmp_path)
            gemini_file.delete()
            return  # Success
            
        except Exception as e:
            err_str = str(e)
            if "429" in err_str and idx < len(api_keys) - 1:
                # Retry with next key
                continue
            else:
                # Cleanup
                try:
                    os.remove(tmp_path)
                    gemini_file.delete()
                except:
                    pass
                print(json.dumps({"error": f"API Error (tried {idx+1} keys): {err_str}"}))
                return

if __name__ == "__main__":
    if len(sys.argv) > 1:
        extract_with_gemini(sys.argv[1])
