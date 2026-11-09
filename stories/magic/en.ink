VAR met_nour = false
VAR met_ysee = false
VAR met_selyan = false
VAR met_abel = false
VAR bond = 0
VAR calling = 0
VAR read_warning = false
-> matin_ville

=== matin_ville ===
On Wednesdays, you open the workshop before Mr Varenne arrives. The longcase clock needs winding, the shavings need sweeping from beneath the bench, and the kettle needs filling. You are twenty, with a room above the shop and clock oil worked into the seams of both sleeves. # passage:matin-ville # segment:matin-ville.p1
This morning, you go down to the canal first. The baker has put aside two rolls. The second is for Varenne, who claims he has eaten and always finishes it before nine. On the bridge, you stand aside for a man pushing a wheelbarrow. A barge scrapes slowly along the bank. # segment:matin-ville.p2
On your way back, you count the day's errands on your fingers: deliver Mrs Arnal's clock, buy a watch spring, collect the six pennies the coal merchant has owed you since Monday. You have forgotten your notebook. You will have to remember. # segment:matin-ville.p3
+ [Get back before the kettle boils over # choice:matin-ville.home] -> etabli

=== etabli ===
Varenne is already at the bench. He has set yesterday's unfinished watch in front of your stool. 'Show me where it sticks.' You open the case and arrange the pieces on a white cloth in the order you removed them. # passage:etabli # segment:etabli.p1
The spring is split. You lift it out with the tweezers, then inspect the balance staff. Varenne lets you look before bringing his lamp closer. 'There. Along the edge.' There is a notch so small that you would have mistaken it for a reflection. # segment:etabli.p2
You wish you could repair it without being shown. He gives you a fine file. 'Someone showed me, too. You do the next bit.' By the time the market bell rings, the edge is smooth and both bread rolls have disappeared. # segment:etabli.p3
+ [Wrap the clock for delivery # choice:etabli.delivery] -> livraison

=== livraison ===
Mrs Arnal lives at the far end of the quay, four flights up. She opens before you knock: she has been watching the window. You set her clock on the mantelpiece and wait beside her for noon. At the eighth stroke, she starts counting on her fingers to make sure. # passage:livraison # segment:livraison.p1
She pays you, then wraps a slice of tart for Varenne. 'Tell him I expect the right time.' On the way back, you call at the supplier's. The watch spring will not arrive until Friday. You can already hear the customer asking why it is taking so long. # segment:livraison.p2
Rain starts as you cross the bridge. You tuck the tart inside your coat and run to the shop. Varenne is packing his bag: a station clock needs adjusting. He leaves you the keys and asks you to lock up at six. # segment:livraison.p3
+ [Finish the afternoon's repairs # choice:livraison.work] -> atelier

=== atelier ===
Around six, you put away the tools and finish the list of parts to order. Over the past few weeks, some clocks have started ticking before you have finished putting them together. You thought you had adjusted them incorrectly. This afternoon, it happened twice. # passage:atelier # segment:atelier.p1
Tonight, a broken watch begins ticking inside a drawer. You removed its spring yesterday. When you reach for it, every other clock stops. # segment:atelier.p2
For one impossible second, you hear somebody laughing on the other side of the wall. The wall opens onto the street. There is nobody there. # segment:atelier.p3
+ [Follow the impossible sound # choice:atelier.listen] -> messagere
+ [Take the watch outside # choice:atelier.watch] -> messagere

=== messagere ===
A woman in a travel-stained coat stands beneath the awning. She is holding a letter with both hands, as though something inside might flutter away. # passage:messagere # segment:messagere.p1
She introduces herself as Nour, a student at Orée. ‘Nine deliveries in this street before I found your shop. Your clocks guided me.’ You ask why the rain hangs motionless on her sleeve. She blows on it; the drops land on your shoes. ‘Sorry. I always forget to undo that spell.’ # segment:messagere.p2
Your name appears on the envelope, one letter at a time. Below it: Orée School of Magic, Admissions. You recognise your own handwriting. Nour notices your expression. ‘The paper copies the handwriting of whoever holds it. That's how we check the recipient.’ # segment:messagere.p3
~ met_nour = true
+ [Accept the letter # choice:messagere.letter # game:take-letter] -> preuve

=== lettre ===
The letter invites you to spend three days taking lessons at Orée. Ysée Valambre, the head teacher, has signed it. A small arrow in the margin moves down to whichever line you are reading. # passage:lettre # segment:lettre.p1
Inside is a timetable: the Listening Garden, the Weight of Air, the Keeping of Small Lights. No fees. No examination of your family. Bring something you have mended. # segment:lettre.p2
You check the timetable: Nour must reach the station gateway before nightfall. There is an hour left. You put the springless watch in its case, fetch your coat and ask where you can write to Mr Varenne. # segment:lettre.p3
+ [Ask whether someone has made a mistake # choice:lettre.doubt]
    -> depart
+ [Tell Nour you want to go now # choice:lettre.go]
    ~ bond += 1
    -> depart

=== depart ===
You leave a note on the workbench: you are visiting a school with Nour and will write tomorrow. You add her address and your own, just in case. Before locking up, you check the gas and turn the shop sign. # passage:depart # segment:depart.p1
As you walk, Nour tells you how she arrived at Orée a year ago. She delivered parcels and could find an address even when the label had rubbed off, simply by holding the package. Her employer called it luck. A teacher showed her how to make the missing letters reappear. # segment:depart.p2
The city lights thin behind you. Ahead, a window shines in the abandoned goods station. The watch in your pocket begins to beat against your palm. # segment:depart.p3
+ [Walk beside Nour # choice:depart.together]
    ~ bond += 1
    -> ville
+ [Take one last look at the town # choice:depart.look] -> ville

=== chemin ===
The grass is silver at its tips. In the distance, a stone doorway stands without a wall around it. Through its opening you can see daylight, although the sun behind you has already set. # passage:chemin # segment:chemin.p1
‘Put the watch on the threshold. The first time you enter, you bring something you have repaired.’ Nour points to a hollow in the stone. ‘Then say your name and ask to enter Orée. The arch keeps your magical signature, not the watch.’ # segment:chemin.p2
You nearly laugh. Then the doorway answers with the sound you heard in the workshop: people laughing, cutlery ringing, somebody practising an instrument very badly. A whole life, waiting just beyond the stone. # segment:chemin.p3
+ [Give your name and ask to enter # choice:chemin.open] -> passage

=== passage ===
The doorway breathes out warm air. A thousand tiny bells sound inside the stone. Your watch unwinds a thread of light and hangs it across the opening. # passage:passage # segment:passage.p1
You step through. # segment:passage.p2
+ [See what lies beyond # choice:passage.cross] -> cour

=== cour ===
Beyond the arch, the school climbs a hillside in crooked terraces: timber houses, covered bridges, a tower with windows full of plants. Someone has hung a hammock between two chimneys. # passage:cour # segment:cour.p1
Above the courtyard, a girl is trying to persuade a cloud out of a laundry basket. A bell rings from the bottom of the well. At a window, a cup refills itself and then overflows, to furious applause. # segment:cour.p2
You stare at the cup filling itself. This morning you would have looked for a hidden pipe in the wall. You ask Nour how many lessons that takes. ‘Far fewer than teaching it when to stop,’ she says. # segment:cour.p3
“Orée,” Nour says. “Home, if you want it.” # segment:cour.p4
+ [Tell her you do # choice:cour.home]
    ~ bond += 1
    -> refectoire
+ [Ask when the lessons begin # choice:cour.lessons] -> refectoire

=== chambre ===
Your room smells of cedar and clean linen. There are two beds, two desks and a window overlooking an orchard. The wardrobe has a handwritten note: Please knock before opening. # passage:chambre # segment:chambre.p1
Nour puts her bag on the other bed. “I asked for a roommate who wouldn't mind questions.” She pauses. “You can change rooms if you like.” # segment:chambre.p2
Downstairs, the supper bowls are washing themselves. Nobody calls you back to the workshop. Nobody tells you there has been a mistake. # segment:chambre.p3
+ [Leave your watch on the desk and stay # choice:chambre.stay] -> matin

=== relais ===
The head teacher is tending a basket of bees in the Listening Garden. She wears an apron with scorch marks and has ink on the bridge of her nose. “Ysée Valambre,” she says. “Please don't call me an enchantress. It encourages the bees.” # passage:relais # segment:relais.p1
Ysée sets a cold candle on a saucer. ‘For Little Light, aim at the tip of the wick and hold your hand still. Picture a point of light, not a flame: we want illumination, not fire. If it grows hot, open your hand and start again.’ # segment:relais.p2
She demonstrates. A white bead appears above the wick; you can pass a finger through it without being burnt. Your first attempt produces only a spark. Ysée moves the saucer closer and has you try again, breathing more slowly. # segment:relais.p3
~ met_ysee = true
+ [Learn Little Light # choice:relais.learn # game:learn-light] -> lueur

=== lueur ===
A flame opens above the wick. It has no heat, but its light falls across your hands like sunlight through a curtain. You made that. You are still making it. # passage:lueur # segment:lueur.p1
Ysée makes you extinguish the light and rekindle it three times. Then she lends you an alder stylus. ‘You can cast with your bare hands. The wood helps direct the gesture, the way a ruler helps you draw a straight line. Keep the point away from anyone's eyes.’ # segment:lueur.p2
Your hand shakes when you take it. Nour is grinning at you from the garden gate. # segment:lueur.p3
+ [Take your first magical tool # choice:lueur.pen # game:take-pen] -> cours_air

=== cours_air ===
Your first classroom is a footbridge. Sélian, the school's ferryman, balances an apple on its rail. His beard is full of windblown seeds. # passage:cours-air # segment:cours-air.p1
Sélian passes a hand beneath the apple without touching it. A nearly transparent thread lifts it a few inches. ‘The thread joins your hand to the object. Pull gently and keep the distance steady. If you jerk it, the apple flies off like a sling stone.’ # segment:cours-air.p2
You try the gesture with your alder pen. A thin, cool line presses against your fingertips. For a moment, you can feel the weight of the apple as clearly as your own heartbeat. # segment:cours-air.p3
~ met_selyan = true
+ [Learn Thread of Air # choice:cours-air.learn # game:learn-air] -> air_test

=== air_test ===
Sélian sets the apple on the rail again. “All the way to the other side. Try to leave the bridge where it is.” Nour moves her feet out of the way. # passage:air-test # segment:air-test.p1
You trace the thread. The river below catches the light from the orchard, carrying little golden squares downstream. You want to learn this so badly that your chest hurts. # segment:air-test.p2
+ [Try lifting the apple with the Thread of Air ability # choice:air-test.cast # game:test-air] -> air_result

=== air_result ===
{game_success:The apple rises from the rail, wavers above the water, then reaches Nour's outstretched hands. She catches it with both palms. 'You can let go now.' You relax your fingers, and she takes its full weight.|The thread slackens too soon. The apple clips the rail and falls into the water. You watch it drift beneath the bridge. Sélian rests a hand on your wrist. 'You turned your hand before it arrived. Let's start from here.'} # passage:air-result # segment:air-result.p1
Sélian asks what you felt just before it moved. He listens to your answer as though there is nothing else he would rather be doing. Then he gives you another apple. # segment:air-result.p2
“Your first lesson is yours now,” he says. “We can work on the landing.” # segment:air-result.p3
+ [Go to the Listening Garden # choice:air-result.next] -> reparation

=== cours_ecoute ===
Ysée's bees are carrying sparks of light between the flowers. Each makes a different note. Together they hold a low, steady chord around the garden. # passage:cours-ecoute # segment:cours-ecoute.p1
‘Counter-song holds a shield as long as you hold the note.’ Ysée taps a bowl with her spoon and hums at the same pitch. A pale ring spreads around her; falling petals slide off its surface. She stops singing, and the ring vanishes at once. # segment:cours-ecoute.p2
You learn the counter-song under your breath. The watch in your pocket ticks along, despite its missing spring. # segment:cours-ecoute.p3
+ [Learn Counter-song # choice:cours-ecoute.learn # game:learn-shield] -> ecoute_test

=== ecoute_test ===
Nour lifts a watering can. “I volunteered. Apparently this makes me an excellent teaching assistant.” Above your head, a little sphere of water begins to tremble. # passage:ecoute-test # segment:ecoute-test.p1
Ysée gives you a nod. You hold the first note and feel the air gather around your shoulders. # segment:ecoute-test.p2
+ [Keep the note steady # choice:ecoute-test.cast # game:test-shield] -> ecoute_result

=== ecoute_result ===
{game_success:The water parts around you in a clear dome. On the other side, Nour is soaked. She looks so offended that you both start laughing.|The note slips. Cold water runs down your collar. Ysée hands you a towel with the solemn dignity of a medal.} # passage:ecoute-result # segment:ecoute-result.p1
Afterwards, the three of you drink tea in the grass. Nobody asks what school you went to before this one. Nobody minds that your coat is old. # segment:ecoute-result.p2
Ysée records your progress on a card, then asks you to return the bowls to the library. Abel is waiting there to explain how the gateways work. Nour carries the wet towels; you take the bowls in both hands, without trying a spell this time. # segment:ecoute-result.p3
+ [Follow the sound of turning pages # choice:ecoute-result.library] -> bibliotheque

=== bibliotheque ===
The library is built around a tree. Its shelves move a little when the branches stir. At a desk beneath the lowest bough, a stoneworker is repairing a book with mortar and a very small trowel. # passage:bibliotheque # segment:bibliotheque.p1
‘Abel. I maintain the gateways.’ He shows you a plan of the arch you crossed. Six inscriptions surround the opening. ‘Each has a job: recognising students, choosing the destination, keeping the way open. This one controls the closing mechanism.’ # segment:bibliotheque.p2
He lays a magnifying glass over a faded mark. ‘Rain has worn away several letters. We closed the outside route yesterday for repairs. The arch also joins the greenhouse to the garden; green lamps mean that route is still safe.’ Beneath the glass, you notice a line the draughtsman has almost rubbed out. # segment:bibliotheque.p3
~ met_abel = true
+ [Ask to learn a protective spell # choice:bibliotheque.ask # game:test-observation] -> archives

=== formule ===
Abel teaches you Dawnstroke: a short line of light, meant to loosen a broken enchantment before it hurts someone. You practise on a stubborn door knocker. It eventually lets go of the desk. # passage:formule # segment:formule.p1
“Use it to make room,” he says. “Never because you enjoy watching something break.” # segment:formule.p2
He fastens a small brass seal to a cord. On its face is a picture of the school with every window lit. “For the new arrival. Wearing it helps you find your way back.” # segment:formule.p3
+ [Learn Dawnstroke # choice:formule.learn # game:learn-dawn] -> sceau

=== sceau ===
You turn the seal over in your palm. On its back someone has scratched a name, then polished it away. It has belonged to other beginners. You find that comforting. # passage:sceau # segment:sceau.p1
Outside, Nour calls you to see the glasshouse before supper. Every pane is reflecting a different sunset. # segment:sceau.p2
+ [Keep the school seal # choice:sceau.keep # game:take-seal] -> entrainement

=== serre ===
Behind Nour, pots rattle on the greenhouse shelves. The door begins to close although nobody is touching it. You pull harder, but her sleeve seems caught inside the stone. # passage:serre # segment:serre.p1
The silence hits hard enough to shake the floor. Every leaf turns towards the old arch. A crack runs through the nearest pane, slow and bright. # segment:serre.p2
Nour tries to call Abel. No sound comes out. The faded mark glows in time with her lips: the arch has caught her voice. You tell her to stop speaking and keep her feet clear of the threshold. She nods, staring at the stone. # segment:serre.p3
+ [Take her hand # choice:serre.hand]
    ~ bond += 1
    -> fissure
+ [Look for the source of the silence # choice:serre.listen] -> fissure

=== fissure ===
A stone figure pulls free of the archway. A bright crack runs down its chest. As it approaches, you can no longer hear your footsteps, then the bell in the well falls silent. The ground still shakes beneath its feet. You retreat with Nour to the first greenhouse step. # passage:fissure # segment:fissure.p1
You reach for the note Ysée taught you. It is still there. So is the thread of air. Three days ago you could not have imagined either. Now they are yours to use. {read_warning:You recognise the missing word: the door has taken a voice to fill its silence. You must unbind the mark, not destroy the arch.|You remember Abel's warning: the door is trying to close around a living voice.} # segment:fissure.p2
Ysée appears across the courtyard. She shouts for you to hold the gateway while Abel cuts the lamps' power. You need to buy a few seconds, not repair the arch. Nour squeezes your hand twice to show that she understands. # segment:fissure.p3
+ [Face the broken guardian # choice:fissure.face # game:test-courage] -> gardien

=== gardien ===
The guardian blocks the narrow path. Light leaks through the cracks in its chest. It is trying to close a door that no longer fits its frame. # passage:gardien # segment:gardien.p1
You raise the alder pen. You can strike with it, use Dawnstroke to loosen the enchantment, or retreat towards Ysée. Nour stays close enough for you to feel her hand on your sleeve. # segment:gardien.p2
+ [Hold the doorway # choice:gardien.fight # game:guardian] -> apres

=== apres ===
{game_success:Your last stroke reaches the empty mark. The guardian folds into a shower of harmless dust. For a heartbeat, the whole courtyard glows.|Ysée reaches you through the silent air and plants her staff in the threshold. Nour catches your arm as the guardian folds around its own light.} # passage:apres # segment:apres.p1
The first sound to return is Nour drawing breath. “That,” she says shakily, “was not on the timetable.” # segment:apres.p2
Then the bells ring, the bees take up their chord, and the school seems to breathe around you. Your hand hurts. You have never been so glad to hear a crowd. # segment:apres.p3
+ [Let Ysée tend your injuries # choice:apres.rest # game:recover] -> infirmerie

=== infirmerie ===
Ysée wraps your hand in a warm cloth. ‘The joint failed before the barriers were in place. Abel raised the alarm; we didn't close the route quickly enough. Tomorrow we'll check every arch.’ She waits for you to move your fingers before tightening the bandage. # passage:infirmerie # segment:infirmerie.p1
Nour has dragged two bowls of soup into the room. She gives you the larger one. {bond > 1:Then she sits beside you, shoulder against yours.|Then she sits by the window, close enough to pass you bread.} # segment:infirmerie.p2
Abel leaves a new timetable on your pillow. Sélian has written a note beneath tomorrow's lesson: Apples provided. The bridge remains optional. # segment:infirmerie.p3
+ [Stay a while longer # choice:infirmerie.stay] -> promesse

=== promesse ===
Later, the orchard is full of lamps. Your watch lies open on the windowsill. Instead of a spring, a little thread of light turns patiently between its wheels. # passage:promesse # segment:promesse.p1
Your name has appeared on the room's door. Beneath it, three spaces are waiting on the timetable. You run your finger over them, already thinking of everything you want to learn. # segment:promesse.p2
+ [Begin with light and invention # choice:promesse.light]
    ~ calling = 1
    -> retour
+ [Learn how to protect the people here # choice:promesse.people]
    ~ calling = 2
    -> retour
+ [Find out what the old door remembers # choice:promesse.memory]
    ~ calling = 3
    -> retour

=== fin ===
Before bed, you write one sentence in a new notebook: I made a light, and someone saw it. # passage:fin # segment:fin.p1
Underneath, you copy tomorrow's lesson: nine o'clock, beside the river, with Sélian. You set out your pen and a dry towel so you will not have to hunt for them in the morning. Nour asks whether you intend to sleep with your timetable. You finally put it in the drawer. # segment:fin.p2
Outside, the school settles into its strange, ordinary noises. Nour wishes you goodnight. The watch keeps time. You leave its little light burning between the beds. # segment:fin.p3
Chapter I complete — Your place at Orée is yours. # segment:fin.p4
-> END

=== preuve ===
“I'm sorry,” you say, “but schools don't send people round to stop all the clocks.” Nour looks at the window with real embarrassment. “No. That was you. I wouldn't know how.” # passage:preuve # segment:preuve.p1
Nour puts a coin on the counter and draws a circle around it with her finger. The coin stands on its edge, follows the circle and stops in front of you. You pass a hand above it: no thread. You pick it up between two fingers. Ordinary copper, still wet from the rain. # segment:preuve.p2
‘You did something similar with the clocks, without meaning to. You need to learn to control it.’ You look at the drawer where the dismantled watch is ticking. You checked it three times yesterday. Nour waits for you to sit down. ‘Come and see the school. If you want to go home afterwards, I'll take you back.’ # segment:preuve.p3
+ [Open the envelope # choice:preuve.open] -> lettre

=== ville ===
Nour stops outside the old goods station. It has been boarded up for twelve years; you pass it every Wednesday on the way to market. Tonight, the left-luggage window is lit. Someone behind it is drying cups. # passage:ville # segment:ville.p1
Nour knocks three times on the boarded door and holds up a brass seal. The boards move aside, one by one, without dropping a nail. ‘Every school maintains a gateway,’ she explains. ‘This one opens only for students and their guests.’ # segment:ville.p2
An entire street has fitted itself between two platforms beneath the glass roof. Umbrellas hang upside down to dry. A baker takes little loaves out of an oven, constellations escaping through their crusts. A woman in blue scolds a staircase for moving its bottom step again. # segment:ville.p3
You stop at a shop window. A clock runs backwards, yet passers-by keep checking it. You want to open its case. Nour has to come back for you; you already have six questions to ask her. # segment:ville.p4
+ [Follow the smell of bread # choice:ville.bread] -> boutique

=== boutique ===
The baker offers you a travelling loaf. “First crossing? It's in the eyes.” Boxes on a shelf bear careful labels: Brief Thunderstorms. Kitchen Memories. Buttons That Find Their Coats. # passage:boutique # segment:boutique.p1
You reach for your purse. Nour gently stops you. Students receive a room and enough to live on; in return, they help maintain the crossings between the worlds. “You learn a trade here, too. You don't buy the right to learn.” # segment:boutique.p2
“Can I come back?” you ask. Her smile grows quieter. “Of course. It's a school, not a kidnapping. You'll write tomorrow. On the first evening, people don't usually have the words.” # segment:boutique.p3
At the far end of the platform, a door opens onto a country path. You know the wall behind that door: it backs onto a warehouse. You step into the grass anyway. It wets your shoe. # segment:boutique.p4
+ [Walk towards the last light # choice:boutique.path] -> chemin

=== refectoire ===
Supper is served beneath a ceiling of living branches. The bowls don't match; the spoons choose their own hands. Yours waits politely while you finish staring at everything. # passage:refectoire # segment:refectoire.p1
Nobody seems surprised to see you. A boy asks you to pass the salt, then apologises: he means the kind that doesn't sing. On your left, an elderly student explains that she discovered her gift at sixty, while mending the same coat for the third time. # segment:refectoire.p2
“We arrive when we hear,” she says. She shares a pear with a blue heart. It tastes exactly like a pear. You are almost disappointed, and then you begin to laugh. # segment:refectoire.p3
Nour tells you about her first week: the sleepless nights, wanting to try every door, fearing she would be sent home because nothing worked the first time. You listen. Little by little, she stops being the messenger of a miracle and becomes someone you would like to have breakfast with. # segment:refectoire.p4
+ [Find your room # choice:refectoire.room] -> chambre

=== matin ===
When you wake, you look for the stain on the workshop ceiling. In its place, the window frames a sky full of silver seeds. The wardrobe coughs. “Good morning,” you say, unsure whether you need to. It opens. # passage:matin # segment:matin.p1
A sheet on your desk lists three rules: never force a living will; learn to undo what you can do; ask for help before you need rescuing. Someone has added in pencil: And don't feed the stairs. # segment:matin.p2
You write to the workshop. You are safe. You have been offered training. You'll come back on Sunday and explain the rest. The letter folds itself, but waits for you to write the address: even here, small things have their limits. # segment:matin.p3
Nour knocks before coming in. “Ready for a proper first day?” You close the watch. For once, you don't want to check the time. # segment:matin.p4
+ [Go to the Listening Garden # choice:matin.garden] -> relais

=== reparation ===
The next two days are nothing like the books you read as a child. You practise the same gesture until your wrist aches. You light a candle, then manage nothing at all ten times running. You learn that wonder and fierce annoyance can occupy the same minute. # passage:reparation # segment:reparation.p1
Above all, Sélian teaches you to undo the thread of air. “Lifting is easy to want. Setting something down without breaking it: that's the work.” On the second evening, you bring a cup safely back to the table. Nour applauds without a trace of irony. # segment:reparation.p2
At the workshop, you hid your strange little successes. Here, someone waits for them with you. That may be the hardest difference to believe. # segment:reparation.p3
+ [Learn to hold a note # choice:reparation.listen] -> cours_ecoute

=== archives ===
{game_success:You make out a word beneath the erased mark: LISTEN. You show Abel the almost invisible trace. He hadn't noticed the damage already reaching the neighbouring letters.|The lines blur together. Abel brings a lamp closer, then shows you the mark himself: it isn't decoration. It's a word with its letters taken out.} # passage:archives # segment:archives.p1
{game_success:
    ~ read_warning = true
}
Abel reads the note in the margin: Never close upon a living voice. ‘Voices guide travellers. Without this safeguard, the arch may hold the last traveller's voice and try to close around them.’ He compares the drawing with his morning measurements. The cracks have grown since yesterday. # segment:archives.p2
He sends Ysée a note through a small copper tube. ‘We must close the greenhouse route too. I'll put up the barriers.’ Before leaving, he opens your textbook at Dawnstroke, a spell for loosening enchantments. He demonstrates the gesture and gives you an old door knocker to practise on. # segment:archives.p3
+ [Begin the lesson # choice:archives.lesson] -> formule

=== entrainement ===
On the third afternoon, Ysée takes you to a courtyard bordered by thick mats. She draws a chalk circle, takes off her apron and picks up a staff with cloth wrapped around both ends. ‘Today, you'll practise with me.’ # passage:entrainement # segment:entrainement.p1
She holds out her arm. A pale blue shield appears between her elbow and wrist. ‘Try to touch my sleeve with your stylus. You can strike the shield to weaken it, or use Dawnstroke to undo it. I'll try to put you off balance. The blows are cushioned; we stop whenever you ask.’ # segment:entrainement.p2
She lets you test the shield with your fingertips: it gives like a cushion, then springs back into shape. Nour sits at the edge of the circle with your notebook. You check that your stylus is equipped before joining Ysée. # segment:entrainement.p3
+ [Take the healing balm and step into the circle # choice:entrainement.enter # game:take-balm] -> duel

=== duel ===
Ysée taps the ground with her staff. A brief vibration travels up through your soles; the shield widens in front of her. She takes her stance without looking away from you. # passage:duel # segment:duel.p1
‘Don't stand there searching for the perfect gesture. A step to the side is a start.’ She waits for you to raise your stylus. Behind her, Nour gives you an encouraging wave. # segment:duel.p2
+ [Fight Ysée in the practice duel # choice:duel.fight # game:training-duel] -> apres_duel

=== apres_duel ===
{game_success:The shield breaks apart under your last blow. The tip of your stylus brushes Ysée's sleeve before she can step back. ‘A hit.’ She lowers her staff and smiles.|Ysée lowers her staff as soon as you drop your guard. She lets you leave the circle and catch your breath. ‘We'll stop here. You can try again when you've rested.’} # passage:apres-duel # segment:apres-duel.p1
She shows you her footprints in the chalk: she always moved towards the side where your arm was slower. You repeat the last movement with her, this time without the blows. Nour writes the advice in your notebook: keep your knees loose and watch your opponent's shoulders. # segment:apres-duel.p2
+ [Rest before your walk # choice:apres-duel.rest # game:recover] -> veille

=== veille ===
After Ysée has tended to you, Nour waits by the orchard with two pieces of bread. Lamps wake one by one beneath the branches. You realise you already recognise the ones that lean towards voices. # passage:veille # segment:veille.p1
Nour stops outside the greenhouse and points to the green lamps above the arch. One flickers. ‘We ought to wait for Abel.’ You notice a warning ribbon on the ground; the peg holding it has come away from the wall. # segment:veille.p2
Nour bends to pick up the ribbon when the well bell stops halfway through a peal. The lamp turns red. She is still standing in the doorway; you catch her sleeve to pull her towards you. # segment:veille.p3
+ [Enter the glasshouse with Nour # choice:veille.glass] -> serre

=== retour ===
The next morning, Mr Varenne's reply waits beneath the door. He has underlined Sunday, then twice, and added: Bring the watch. I want to see this. You write the train time on your timetable and ask Nour where to buy two tickets. # passage:retour # segment:retour.p1
{calling == 1:You ask Sélian whether a spring can be made of light. He pulls up a chair.|{calling == 2:You ask Ysée how to give a door a voice without stealing someone else's. She opens her notebook.|You ask Abel who erased the arch's first word. He is silent for a moment, then makes room for you at his desk.}} # segment:retour.p2
There is half an hour before class. You open the textbook where Abel marked it and copy the first diagram into your notebook. This time you know what all six inscriptions do. You underline the one that needs repairing. # segment:retour.p3
+ [Begin your first real work as a wizard # choice:retour.begin] -> fin
