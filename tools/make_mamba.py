# docs/cards-draft.md 3절의 블랙맘바 55장을 data/mamba.json으로 옮긴다 (영어 이름·설명을 함께 붙임).
import re, json
s = open('docs/cards-draft.md').read()
sec = s[s.index('## 3.'):s.index('## 4.')]
rows = re.findall(r'\| (\d+) \| (.+?) \| (.+?) \| (.+?) \|\n', sec)
EN = {
 1:('Test Panic Mamba','When a test gets close, my mind goes blank and my hands shake'),
 2:('Comparison Mamba','Seeing friends\' grades or social media makes me feel left behind'),
 3:('Burnout Mamba','I\'ve been running nonstop and now I don\'t want to do anything'),
 4:('Drained Mamba','I know what I have to do, but my body won\'t move'),
 5:('Irritation Mamba','Studying makes me edgy, and little things set me off'),
 6:('Side-Eye Mamba','I don\'t ask questions because I\'m afraid I\'ll look dumb'),
 7:('Expectation Mamba','Parents\' or teachers\' expectations weigh on me until I can\'t breathe'),
 8:('Loner Mamba','I have no one to study with or talk to'),
 9:('Self-Blame Mamba','One mistake and I sink into "I\'m hopeless" for a long time'),
 10:('Swamped Mamba','There\'s so much to do that I don\'t know where to start'),
 11:('Boredom Mamba','This subject is just boring, so I never get to it'),
 12:('Sleepy Mamba','I stay up late and I\'m too tired to focus in class or at home'),
 13:('Mistake-Fear Mamba','I\'m so afraid of being wrong that I only stare at the answer key'),
 14:('Meh Mamba','Everything feels like a hassle and I can\'t think of a single reason to do it'),
 15:('Hurry Mamba','I\'m in a rush to raise my grades, so my mind races and nothing gets done'),
 16:('What\'s-the-Point Mamba','"It won\'t work anyway" comes to mind first'),
 17:('Perfect Mamba','If I can\'t do it perfectly, I don\'t start at all'),
 18:('Later Mamba','There\'s plenty of time, I can cram it all later'),
 19:('Why-Bother Mamba','I don\'t see where I\'ll ever use this'),
 20:('Talent Mamba','I think studying is only for naturally smart kids'),
 21:('Illusion Mamba','After reading once, I think I know it all'),
 22:('Results-Only Mamba','I only care about scores, so studying feels joyless and tense'),
 23:('Too-Late Mamba','I think I\'m too far behind to ever catch up'),
 24:('Blame Mamba','It\'s the teacher\'s fault, or my situation\'s, that it won\'t work'),
 25:('Right-Answer Mamba','If I can\'t choose a career, studying feels pointless'),
 26:('One-Shot Mamba','I believe one big cram session will do it'),
 27:('Secret Mamba','I keep my struggles to myself so I won\'t look weak'),
 28:('Only-Me Mamba','Everyone seems to get it but me, so I give up'),
 29:('All-or-Nothing Mamba','Anything less than 100 feels like failure'),
 30:('Luck Mamba','Tests are luck anyway, so studying doesn\'t change much'),
 31:('Short-Form Mamba','"Just one short" turns into an hour'),
 32:('Ping Mamba','A notification pops up and I grab my phone right away'),
 33:('Game Mamba','"One more round" never ends'),
 34:('Cram Mamba','I cram the night before and forget it all the next day'),
 35:('Highlighter Mamba','I highlight and copy a lot, but nothing sticks'),
 36:('Plan-Only Mamba','I make beautiful plans and never follow them'),
 37:('Multitask Mamba','I study with music, chats, and videos all on'),
 38:('Skip-Mistakes Mamba','I skip the problems I got wrong because I hate looking at them'),
 39:('Bed Mamba','I study in bed and fall asleep'),
 40:('Daydream Mamba','I drift off in class and lose the thread'),
 41:('No-Help Mamba','Even as questions pile up, I never ask for help'),
 42:('Homework-Only Mamba','Once homework is done, I think I\'m done studying'),
 43:('Study-Video Mamba','I watch study-tip videos and never actually start'),
 44:('Decorating Mamba','I spend my time tidying my desk and decorating notes'),
 45:('All-Nighter Mamba','I pull an all-nighter and doze through class the next day'),
 46:('Chatty Study Mamba','We meet to study and end up just chatting'),
 47:('No-Notes Mamba','I don\'t take notes in class, so there\'s nothing to review'),
 48:('Academy-Only Mamba','I only attend cram school and never review on my own'),
 49:('Answer-Key Mamba','The moment I\'m stuck, I check the answers'),
 50:('Lost-Weekend Mamba','I sleep in on weekends and the day just disappears'),
 51:('Ten-Minutes Mamba','"Just a 10-minute break" becomes an hour'),
 52:('Picky Mamba','I only study the subjects I like and keep putting off the rest'),
 53:('Workbook-Shopping Mamba','I keep buying workbooks and never finish one'),
 54:('Group-Chat Mamba','I keep jumping into group chats and my studying breaks apart'),
 55:('Wandering Mamba','I keep getting up for water or snacks'),
}
cat = lambda n: 'heart' if n <= 15 else 'thought' if n <= 30 else 'action'
cards = []
for no, name, desc, tags in rows:
    n = int(no)
    en_name, en_desc = EN[n]
    cards.append({
        'id': n, 'category': cat(n), 'tags': [t.strip() for t in tags.split(',')],
        'ko': {'name': name, 'desc': desc, 'word': name.replace(' 맘바', '')},
        'en': {'name': en_name, 'desc': en_desc, 'word': en_name.replace(' Mamba', '')},
    })
out = {
    'note': '4화 운행 방해 카드 55장 (마음 15·생각 15·행동 25). docs/cards-draft.md에서 tools/make_mamba.py로 만든다. tags는 5화 우회 노선 카드와 맞춰 효과를 정한다.',
    'categories': [{'id': 'heart', 'ko': '마음', 'en': 'Heart'}, {'id': 'thought', 'ko': '생각', 'en': 'Thought'}, {'id': 'action', 'ko': '행동', 'en': 'Action'}],
    'cards': cards,
}
json.dump(out, open('data/mamba.json', 'w'), ensure_ascii=False, indent=1)
print('ok', len(cards))
