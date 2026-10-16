# docs/cards-draft.md 4절의 우회 노선 카드 55장을 data/detour.json으로 옮긴다 (영어 이름·설명을 함께 붙임).
import re, json
s = open('docs/cards-draft.md').read()
sec = s[s.index('## 4.'):s.index('## 5.')]
rows = re.findall(r'\| (\d+) \| (.+?) \| (.+?) \| (.+?) \|\n', sec)
EN = {
 1:('4-Second Breathing','Breathe in for 4, hold for 4, out for 4. Three times. Let your tense body settle first'),
 2:('Worry Dump','Before a test, write every worry on paper for 3 minutes. It frees up room in your head'),
 3:('Like a Friend','Talk to yourself the way you\'d talk to a friend. "That happens. Fix it next time"'),
 4:('Not Yet','Not "I can\'t" but "I can\'t yet." Skill isn\'t fixed. It grows'),
 5:('Compare to Me','Compare yourself with last week\'s you, not with others'),
 6:('Why This','Write one line on how this subject connects to your final station'),
 7:('Small Wins Log','Write down one thing you got done today. They pile up into proof'),
 8:('Asking Is a Right','Asking about what you don\'t know isn\'t weak. It\'s the fast way'),
 9:('Talk It Out','Tell one person you trust what\'s hard. You don\'t have to hold it alone'),
 10:('Study Buddy','Set a time with a friend, study together and check on each other'),
 11:('Rest Is a Plan','Plan your breaks ahead and you can rest without guilt'),
 12:('Protect Sleep','Cut sleep to study and memories don\'t get saved. Set bedtime first'),
 13:('Body First','Wake your body with 5 minutes of walking or stretching. Mood follows the body'),
 14:('Name the Feeling','Saying "I feel anxious right now" helps it settle a little'),
 15:('Review the Bad Test','Find just one lesson in a test that went badly. Failure becomes data'),
 16:('Expectation Talk','Talk honestly with parents or teachers about the pressure you feel'),
 17:('Note to Future Me','Write a short cheer to the you standing at your final station'),
 18:('Link What You Love','Find links between what you love (games, music, sports) and a subject'),
 19:('Done Over Perfect','Practice finishing at 80%. Finished work is what builds skill'),
 20:('Pause Comparison Apps','During exams, hide or delete the apps that make you compare'),
 21:('Just 5 Minutes','Start with "just 5 minutes." Starting is the heaviest part'),
 22:('First Line Ready','Decide the first problem you\'ll do before you sit down'),
 23:('Pomodoro','Focus for 25 minutes, rest for 5, repeat'),
 24:('Phone in Another Room','When you study, put your phone in another room or in your bag. If you see it, it wins'),
 25:('Notifications Off','Turn on Do Not Disturb while you study'),
 26:('One Thing at a Time','Turn off music and chats. Do one thing'),
 27:('Study Spot','Pick a spot just for studying. The bed is for sleeping'),
 28:('Retrieval Practice','Close the book and write what you remember. The more you pull it out, the longer it stays'),
 29:('Spaced Review','Look again today, in 3 days and in a week. It lasts longer than cramming'),
 30:('Self-Test','Make your own questions and solve them like a real test'),
 31:('Explain It','Explain it to a friend or an empty room. Where you get stuck is what you don\'t know'),
 32:('Mistake Notes','For each wrong answer, write one line on why it was wrong'),
 33:('Mix It Up','Don\'t drill one problem type. Mix several types together'),
 34:('Read with Questions','Before reading, ask "What do I need to know from this unit?"'),
 35:('One-Page Summary','Put a whole unit on one page as a drawing or table'),
 36:('Fake-Knowing Check','At the end, check: "Can I explain this?"'),
 37:('Plan Backward','Count back from test day and set tasks for each day'),
 38:('Break It Down','Not "study math" but "textbook p. 42-45 problems"'),
 39:('If-Then','Decide ahead: "If I want my phone, I\'ll drink some water and do 5 more minutes"'),
 40:('Weekly Check','Ten minutes on Sunday: did the plan work? Fix next week'),
 41:('Class Is Round One','Focusing in class is the cheapest studying. Review for 5 minutes after'),
 42:('Reward After','Do the set amount first, then the reward (game, snack)'),
 43:('Stack a Habit','Attach it to something you already do. "After dinner, 20 words"'),
 44:('Help Map','Write down who and what to ask when stuck (teacher, friend, online class)'),
 45:('Amount, Not Hours','Set goals like "20 problems" instead of "3 hours"'),
 46:('Time Blocks','Split the day into blocks and put one subject in each'),
 47:('Hardest First','Do the hardest subject when your focus is best'),
 48:('Concept First','Sort out the concept once before jumping into problems'),
 49:('My Own Example','Attach an example you made up to each new concept'),
 50:('Concept Map','Draw a mind map of how the ideas connect'),
 51:('Pocket Cards','Flip through 10 word or formula cards on the bus or at break'),
 52:('Test Rehearsal','Time yourself on a past paper like the real test. The real one gets less scary'),
 53:('Study Check-In','Send study photos back and forth with a friend and keep each other going'),
 54:('2-Minute Reset','Clear your desk for 2 minutes before studying. Keep only what you need'),
 55:('Bring One Question','At break, take one question to your teacher'),
}
cards = []
for no, name, desc, tags in rows:
    n = int(no)
    en_name, en_desc = EN[n]
    cards.append({
        'id': n, 'route': 'heart' if n <= 20 else 'study', 'tags': [t.strip() for t in tags.split(',')],
        'ko': {'name': name, 'desc': desc}, 'en': {'name': en_name, 'desc': en_desc},
    })
out = {
    'note': '5화 우회 노선 카드 55장 (마음 노선 20·공부 노선 35). docs/cards-draft.md에서 tools/make_detour.py로 만든다. tags가 블랙맘바 카드의 tags와 겹치면 효과가 크다.',
    'routes': [{'id': 'heart', 'ko': '마음 노선', 'en': 'Heart Line'}, {'id': 'study', 'ko': '공부 노선', 'en': 'Study Line'}],
    'tags': {
        'calm': {'ko': '진정', 'en': 'Calm', 'color': '#6fc3ff'},
        'selfworth': {'ko': '자신감', 'en': 'Self-worth', 'color': '#ff8fb8'},
        'motivation': {'ko': '동기', 'en': 'Drive', 'color': '#ffb44a'},
        'relation': {'ko': '관계', 'en': 'People', 'color': '#b48cff'},
        'focus': {'ko': '집중', 'en': 'Focus', 'color': '#5ee0c8'},
        'start': {'ko': '시작', 'en': 'Start', 'color': '#9be36a'},
        'plan': {'ko': '계획', 'en': 'Plan', 'color': '#ffe06a'},
        'method': {'ko': '공부법', 'en': 'Method', 'color': '#ff7a6a'},
    },
    'cards': cards,
}
json.dump(out, open('data/detour.json', 'w'), ensure_ascii=False, indent=1)
print('ok', len(cards))
