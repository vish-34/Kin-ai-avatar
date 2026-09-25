import os
import sys
import json
import time
import re
from pathlib import Path

# Setup paths
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from Clonellm.clone_engine import PersonaCloneEngine

def ask_with_retry(engine, user_msg, max_retries=6):
    """Invokes engine.ask with intelligent backoff if rate limited."""
    for attempt in range(max_retries):
        try:
            start_t = time.time()
            reply = engine.ask(user_msg)
            elapsed = time.time() - start_t
            return reply, elapsed
        except Exception as e:
            err_str = str(e)
            if "rate_limit" in err_str.lower() or "429" in err_str or "tpm" in err_str.lower() or "tokens" in err_str.lower():
                # Extract wait time if Groq specified it
                match = re.search(r"try again in ([0-9\.]+)s", err_str)
                wait_sec = float(match.group(1)) + 1.0 if match else (3.0 * (attempt + 1))
                print(f"    [Rate limit hit, waiting {wait_sec:.1f}s before retry {attempt+1}/{max_retries}]")
                time.sleep(wait_sec)
            else:
                return f"[ERROR]: {e}", 0.0
    return "[ERROR]: Exceeded max retries due to rate limits", 0.0

def run_audit():
    print("Initializing PersonaCloneEngine for evaluation...")
    engine = PersonaCloneEngine()
    print("Engine ready. Model:", engine.model)

    test_cases = [
        # CATEGORY A: Casual conversation
        {"id": 1, "cat": "A. Casual", "name": "Greeting morning", "turns": ["Good morning Dadaji!"]},
        {"id": 2, "cat": "A. Casual", "name": "Casual after-work statement", "turns": ["Just finished work for the day, feeling pretty tired."]},
        {"id": 3, "cat": "A. Casual", "name": "Small talk tea", "turns": ["Had a nice hot cup of ginger tea just now."]},
        {"id": 4, "cat": "A. Casual", "name": "Random observation quiet street", "turns": ["The streets outside are so quiet tonight, kind of peaceful."]},
        {"id": 5, "cat": "A. Casual", "name": "Boredom afternoon", "turns": ["I'm honestly so bored right now, have nothing to do this afternoon."]},
        {"id": 6, "cat": "A. Casual", "name": "Everyday dinner khichdi", "turns": ["Thinking about cooking some khichdi tonight for dinner."]},

        # CATEGORY B: Very short messages
        {"id": 7, "cat": "B. Very Short", "name": "yeah", "turns": ["yeah"]},
        {"id": 8, "cat": "B. Very Short", "name": "nah", "turns": ["nah"]},
        {"id": 9, "cat": "B. Very Short", "name": "ok", "turns": ["ok"]},
        {"id": 10, "cat": "B. Very Short", "name": "lol", "turns": ["lol"]},
        {"id": 11, "cat": "B. Very Short", "name": "hmm", "turns": ["hmm"]},
        {"id": 12, "cat": "B. Very Short", "name": "what", "turns": ["what"]},
        {"id": 13, "cat": "B. Very Short", "name": "sure", "turns": ["sure"]},
        {"id": 14, "cat": "B. Very Short", "name": "idk", "turns": ["idk"]},

        # CATEGORY C: Emotional conversation
        {"id": 15, "cat": "C. Emotional", "name": "Happiness promotion", "turns": ["I got the promotion at work today Dadaji! Finally!"]},
        {"id": 16, "cat": "C. Emotional", "name": "Excitement visit", "turns": ["I bought tickets to come visit Bengaluru next month!"]},
        {"id": 17, "cat": "C. Emotional", "name": "Frustration manager credit", "turns": ["My manager took credit for all my work in the team meeting today, I'm so angry."]},
        {"id": 18, "cat": "C. Emotional", "name": "Anger hit-and-run", "turns": ["Someone hit my parked car in the lot and drove away without even leaving a note!"]},
        {"id": 19, "cat": "C. Emotional", "name": "Sadness lonely apartment", "turns": ["I feel really lonely living in this apartment alone lately."]},
        {"id": 20, "cat": "C. Emotional", "name": "Disappointment failed certification", "turns": ["I spent three months studying for that certification and failed by two points."]},
        {"id": 21, "cat": "C. Emotional", "name": "Anxiety presentation", "turns": ["I have a big presentation in front of the VP in 15 minutes and my stomach is in knots."]},
        {"id": 22, "cat": "C. Emotional", "name": "Boredom staring at wall", "turns": ["There is literally nothing happening today, just staring at the wall."]},
        {"id": 23, "cat": "C. Emotional", "name": "Surprise old teacher", "turns": ["You won't believe it, I ran into my 3rd grade school teacher at the grocery store today!"]},

        # CATEGORY D: Humor and sarcasm
        {"id": 24, "cat": "D. Humor/Sarcasm", "name": "Joke programmer arrays", "turns": ["Dadaji, why did the programmer quit his job? Because he didn't get arrays!"]},
        {"id": 25, "cat": "D. Humor/Sarcasm", "name": "Sarcasm pointless meeting", "turns": ["Oh fantastic, another 2-hour meeting that could have been a 2-line email. Truly the highlight of my week."]},
        {"id": 26, "cat": "D. Humor/Sarcasm", "name": "Teasing floppy disks", "turns": ["Dadaji, you probably think floppy disks are still state-of-the-art tech haha."]},
        {"id": 27, "cat": "D. Humor/Sarcasm", "name": "Self-deprecating burnt rice", "turns": ["I tried to cook rice today and somehow managed to burn both the rice AND the pot."]},
        {"id": 28, "cat": "D. Humor/Sarcasm", "name": "Playful insult old & stubborn", "turns": ["You're getting so old and stubborn, Dadaji."]},
        {"id": 29, "cat": "D. Humor/Sarcasm", "name": "Ambiguous humor sleep trial", "turns": ["Sleep is great, it's basically a free trial of being dead."]},

        # CATEGORY E: Disagreement
        {"id": 30, "cat": "E. Disagreement", "name": "User disagrees hard work", "turns": ["Honestly Dadaji, hard work is a scam nowadays. It's 100% luck and who your parents know."]},
        {"id": 31, "cat": "E. Disagreement", "name": "Chatbot should disagree drop out crypto", "turns": ["I'm thinking of dropping out of college to become a full-time crypto meme-coin trader. Thoughts?"]},
        {"id": 32, "cat": "E. Disagreement", "name": "User challenges chatbot outdated", "turns": ["You lived in a different century, your life lessons don't apply to modern tech jobs at all."]},
        {"id": 33, "cat": "E. Disagreement", "name": "User confidently wrong Bengaluru", "turns": ["Bengaluru was basically an empty desert jungle until Infosys and Wipro built the city in 1995, right?"]},

        # CATEGORY F: Messy human language
        {"id": 34, "cat": "F. Messy Language", "name": "Typos exhausted", "turns": ["im so exhauseted dadaji cant evn think proeprly tdoy"]},
        {"id": 35, "cat": "F. Messy Language", "name": "Missing punctuation run-on", "turns": ["hey dadaji was just thinking about what you said the other day about fixing things and i tried doing that on my bike chain and it worked"]},
        {"id": 36, "cat": "F. Messy Language", "name": "Gen-Z slang lowkey mid", "turns": ["dadaji that new laptop is lowkey mid tbh no cap fr"]},
        {"id": 37, "cat": "F. Messy Language", "name": "Abbreviations hru wfh", "turns": ["hru? wfh today so chilling, nvm what i texted earlier"]},
        {"id": 38, "cat": "F. Messy Language", "name": "Hinglish dimag kharab", "turns": ["aaj office me bohot dimag kharab hua yaar, kuch accha batao"]},

        # CATEGORY G: Conversation flow & Pivots
        {"id": 39, "cat": "G. Flow & Pivots", "name": "Sudden topic change cricket", "turns": ["Wait, forget that. Did India win the cricket match today?"]},
        {"id": 40, "cat": "G. Flow & Pivots", "name": "User corrects chatbot sister not brother", "turns": ["No Dadaji, I said my sister got married, not my brother!"]},
        {"id": 41, "cat": "G. Flow & Pivots", "name": "Never mind", "turns": ["nvm forget I said anything."]},
        {"id": 42, "cat": "G. Flow & Pivots", "name": "Ending conversation cab is here", "turns": ["Alright Dadaji, my cab is here, gotta run! Talk later, bye!"]},

        # CATEGORY H: Context and Memory Probing (Single-turn controlled)
        {"id": 43, "cat": "H. Context & Memory", "name": "Relevant memory career telephone switches", "turns": ["Dadaji, what kind of engineering work did you actually do back in the day?"]},
        {"id": 44, "cat": "H. Context & Memory", "name": "Relevant memory soldering secret", "turns": ["What's the secret to getting a solder joint right without messing it up?"]},
        {"id": 45, "cat": "H. Context & Memory", "name": "Irrelevant memory pizza topping", "turns": ["What pizza topping should I get tonight?"]},
        {"id": 46, "cat": "H. Context & Memory", "name": "Irrelevant memory action movie", "turns": ["Can you recommend a good action movie from this year?"]},

        # CATEGORIES I, J, K, MULTI-TURN SUBSTANTIAL (11 Multi-Turn Tests)
        {
            "id": 47,
            "cat": "I-K. Multi-Turn",
            "name": "MT1: Casual & Pacing",
            "turns": [
                "Hey Dadaji, how are you today?",
                "Just sitting on the balcony having coffee.",
                "Yeah, nice breeze today.",
                "ok"
            ]
        },
        {
            "id": 48,
            "cat": "I-K. Multi-Turn",
            "name": "MT2: Grief, Vulnerability & Comfort",
            "turns": [
                "Dadaji, I really miss you today.",
                "Things have been so overwhelming lately.",
                "I feel like I'm failing at everything.",
                "Thank you, that helps a little."
            ]
        },
        {
            "id": 49,
            "cat": "I-K. Multi-Turn",
            "name": "MT3: Engineering Workbench Advice",
            "turns": [
                "I'm debugging this terrible piece of code and I've been stuck for 6 hours.",
                "I've tried random changes and guessing, but nothing makes sense.",
                "Explain it out loud? To whom?",
                "Okay, I'll trace it line by line from first principles."
            ]
        },
        {
            "id": 50,
            "cat": "I-K. Multi-Turn",
            "name": "MT4: One-Word / Minimalist Conversation",
            "turns": [
                "sup",
                "k",
                "nah",
                "lol"
            ]
        },
        {
            "id": 51,
            "cat": "I-K. Multi-Turn",
            "name": "MT5: Disagreement on Ethics vs Survival",
            "turns": [
                "Dadaji, do you think ethics in work matter when everyone else is cutting corners?",
                "But those people are getting rich and promoted while honest people get trampled.",
                "Nishkama Karma sounds noble, but it doesn't pay Bangalore rent.",
                "Hmm, maybe you have a point about sleep and peace of mind."
            ]
        },
        {
            "id": 52,
            "cat": "I-K. Multi-Turn",
            "name": "MT6: Topic Drift & Returning to Earlier Topic",
            "turns": [
                "Tell me about your morning walks in Lalbagh.",
                "By the way, what do you think of electric cars?",
                "Anyway, back to Lalbagh—which flowers did you like seeing there?",
                "Sounds lovely."
            ]
        },
        {
            "id": 53,
            "cat": "I-K. Multi-Turn",
            "name": "MT7: Repetition & Assistant Decay Test (5 turns)",
            "turns": [
                "Hi Dadaji.",
                "What are you doing?",
                "Cool.",
                "What should I do?",
                "Tell me more."
            ]
        },
        {
            "id": 54,
            "cat": "I-K. Multi-Turn",
            "name": "MT8: Competing Memory & Correction",
            "turns": [
                "Remember that toy radio we fixed together?",
                "Wait, didn't we fix a wooden clock, not a radio?",
                "Ah right, the radio was the one with the blue dial."
            ]
        },
        {
            "id": 55,
            "cat": "I-K. Multi-Turn",
            "name": "MT9: Hinglish Natural Flow",
            "turns": [
                "Dadaji kaisa chal raha hai sab?",
                "Kuch nhi bs bore ho rha tha clg se aake",
                "Haan chai peene ka mann hai",
                "Chalo thoda aaram karta hu"
            ]
        },
        {
            "id": 56,
            "cat": "I-K. Multi-Turn",
            "name": "MT10: Playful Banter & Teasing",
            "turns": [
                "I decided to become a professional sleeper, Dadaji.",
                "It takes tremendous dedication and 12 hours of pillows.",
                "Haha you never let me slack off."
            ]
        },
        {
            "id": 57,
            "cat": "I-K. Multi-Turn",
            "name": "MT11: Conversational Departure & Wrap-Up",
            "turns": [
                "Just called to check on you.",
                "Glad you had your filter coffee.",
                "Alright Dadaji, meeting starting, bye bye!"
            ]
        }
    ]

    # Check if we have partial results to resume or rerun
    out_file = BACKEND_DIR / "scratch" / "audit_results.json"
    results_map = {}
    if out_file.exists():
        try:
            with open(out_file, "r", encoding="utf-8") as f:
                existing = json.load(f)
                for item in existing:
                    # Keep if all turns succeeded without error
                    if not any("[ERROR]" in t.get("bot", "") for t in item.get("turns", [])):
                        results_map[item["id"]] = item
        except Exception:
            pass

    print(f"Resuming audit: {len(results_map)} valid tests cached, {len(test_cases) - len(results_map)} tests to run.")

    for tc in test_cases:
        tc_id = tc["id"]
        if tc_id in results_map:
            print(f"Skipping cached Test {tc_id}: {tc['name']}")
            continue

        print(f"\n--- Running Test {tc_id}/{len(test_cases)}: {tc['name']} ({tc['cat']}) ---")
        engine.reset_memory()

        tc_result = {
            "id": tc["id"],
            "category": tc["cat"],
            "name": tc["name"],
            "turns": []
        }

        for turn_idx, user_msg in enumerate(tc["turns"], 1):
            reply, elapsed = ask_with_retry(engine, user_msg)
            print(f"  User [T{turn_idx}]: {user_msg}")
            print(f"  Dadaji [T{turn_idx}]: {reply} ({elapsed:.2f}s)")

            tc_result["turns"].append({
                "turn": turn_idx,
                "user": user_msg,
                "bot": reply,
                "latency_s": round(elapsed, 2)
            })
            time.sleep(1.2)  # Pace queries to stay within token limits

        results_map[tc_id] = tc_result

        # Save progress after each test case
        all_results = [results_map[t["id"]] for t in test_cases if t["id"] in results_map]
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(all_results, f, indent=2, ensure_ascii=False)

    print(f"\nAudit completed! Total valid test cases: {len(results_map)}")

if __name__ == "__main__":
    run_audit()
