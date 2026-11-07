VAR met_nour = false
VAR met_ysee = false
VAR met_selyan = false
VAR met_abel = false
VAR bond = 0
VAR calling = 0
-> atelier

=== atelier ===
At twenty, you know how to repair a clock without ever making time feel like your own. Every morning, the same shutters. Every evening, the same square of sky above the workshop sink. # passage:atelier # segment:atelier.p1
Tonight, a broken watch begins ticking inside a drawer. You removed its spring yesterday. When you reach for it, every other clock stops. # segment:atelier.p2
For one impossible second, you hear somebody laughing on the other side of the wall. The wall opens onto the street. There is nobody there. # segment:atelier.p3
+ [Follow the impossible sound # choice:atelier.listen] -> messagere
+ [Take the watch outside # choice:atelier.watch] -> messagere

=== messagere ===
A woman in a travel-stained coat stands beneath the awning. She is holding a letter with both hands, as though something inside might flutter away. # passage:messagere # segment:messagere.p1
“I've walked past this shop nine times,” she says. “You heard us at last.” She introduces herself as Nour. Rain hangs motionless on her sleeve. # segment:messagere.p2
Your name is written on the envelope in your own handwriting. Underneath it: The School of Impossible Things. Admissions remain open until the last light. # segment:messagere.p3
~ met_nour = true
+ [Accept the letter # choice:messagere.letter # game:take-letter] -> lettre

=== lettre ===
The paper is warm. A single line appears beneath your thumb: You have spent enough years mistaking your gift for a fault. # passage:lettre # segment:lettre.p1
Inside is a timetable: the Listening Garden, the Weight of Air, the Keeping of Small Lights. No fees. No examination of your family. Bring something you have mended. # segment:lettre.p2
You put the springless watch in your pocket. For the first time all year, tomorrow is difficult to imagine. That feels wonderful. # segment:lettre.p3
+ [Ask whether someone has made a mistake # choice:lettre.doubt]
    -> depart
+ [Tell Nour you want to go now # choice:lettre.go]
    ~ bond += 1
    -> depart

=== depart ===
You leave a note for the morning shift. Your handwriting stays ordinary on this piece of paper. It feels important to say goodbye properly, even to a life that has grown too small. # passage:depart # segment:depart.p1
Nour leads you past the last bus stop. “I used to deliver parcels,” she says. “I thought the little things I noticed were useless. Which floorboard a room was hiding. Whether a locked box was lonely.” # segment:depart.p2
The city lights thin behind you. Ahead, a footpath crosses a field that no map of your town has ever shown. The watch in your pocket begins to beat against your palm. # segment:depart.p3
+ [Walk beside Nour # choice:depart.together]
    ~ bond += 1
    -> chemin
+ [Take one last look at the town # choice:depart.look] -> chemin

=== chemin ===
The grass is silver at its tips. In the distance, a stone doorway stands without a wall around it. Through its opening you can see daylight, although the sun behind you has already set. # passage:chemin # segment:chemin.p1
“Put the watch on the threshold,” Nour whispers. “Then ask for the time you haven't lived yet.” # segment:chemin.p2
You nearly laugh. Then the doorway answers with the sound you heard in the workshop: people laughing, cutlery ringing, somebody practising an instrument very badly. A whole life, waiting just beyond the stone. # segment:chemin.p3
+ [Ask for your unwritten time # choice:chemin.open] -> passage

=== passage ===
The doorway breathes out warm air. A thousand tiny bells sound inside the stone. Your watch unwinds a thread of light and hangs it across the opening. # passage:passage # segment:passage.p1
You step through. # segment:passage.p2
+ [See what lies beyond # choice:passage.cross] -> cour

=== cour ===
Beyond the arch, the school climbs a hillside in crooked terraces: timber houses, covered bridges, a tower with windows full of plants. Someone has hung a hammock between two chimneys. # passage:cour # segment:cour.p1
Above the courtyard, a girl is trying to persuade a cloud out of a laundry basket. A bell rings from the bottom of the well. At a window, a cup refills itself and then overflows, to furious applause. # segment:cour.p2
You stand very still. All the strange, useless little things you have concealed about yourself suddenly seem like the beginning of a language. # segment:cour.p3
“Orée,” Nour says. “Home, if you want it.” # segment:cour.p4
+ [Tell her you do # choice:cour.home]
    ~ bond += 1
    -> chambre
+ [Ask when the lessons begin # choice:cour.lessons] -> chambre

=== chambre ===
Your room smells of cedar and clean linen. There are two beds, two desks and a window overlooking an orchard. The wardrobe has a handwritten note: Please knock before opening. # passage:chambre # segment:chambre.p1
Nour puts her bag on the other bed. “I asked for a roommate who wouldn't mind questions.” She pauses. “You can change rooms if you like.” # segment:chambre.p2
Downstairs, a long table is being laid for supper. Nobody calls you back to the workshop. Nobody tells you there has been a mistake. # segment:chambre.p3
+ [Leave your watch on the desk and stay # choice:chambre.stay] -> relais

=== relais ===
The head teacher is tending a basket of bees in the Listening Garden. She wears an apron with scorch marks and has ink on the bridge of her nose. “Ysée Valambre,” she says. “Please don't call me an enchantress. It encourages the bees.” # passage:relais # segment:relais.p1
She asks you to hold a cold candle. “Magic begins with attention. Give this little thing somewhere to be warm.” # segment:relais.p2
You think of the workshop in winter. Of fingers stiff with cold. Of how often you wished somebody had left a light on for you. # segment:relais.p3
~ met_ysee = true
+ [Learn Little Light # choice:relais.learn # game:learn-light] -> lueur

=== lueur ===
A flame opens above the wick. It has no heat, but its light falls across your hands like sunlight through a curtain. You made that. You are still making it. # passage:lueur # segment:lueur.p1
Ysée lets the silence last. Then she places an alder pen beside the candle. “For writing invitations to the world. Some people use a wand. Some sing. A good tool helps you listen to your own intention.” # segment:lueur.p2
Your hand shakes when you take it. Nour is grinning at you from the garden gate. # segment:lueur.p3
+ [Take your first magical tool # choice:lueur.pen # game:take-pen] -> cours_air

=== cours_air ===
Your first classroom is a footbridge. Sélian, the school's ferryman, balances an apple on its rail. His beard is full of windblown seeds. # passage:cours-air # segment:cours-air.p1
“Things fall because they have somewhere to go,” he says. “Offer another destination.” He draws a thread through the air with one finger. The apple lifts. A leaf rises after it, hopefully. # segment:cours-air.p2
You try the gesture with your alder pen. A thin, cool line presses against your fingertips. For a moment, you can feel the weight of the apple as clearly as your own heartbeat. # segment:cours-air.p3
~ met_selyan = true
+ [Learn Thread of Air # choice:cours-air.learn # game:learn-air] -> air_test

=== air_test ===
Sélian sets the apple on the rail again. “All the way to the other side. Try to leave the bridge where it is.” Nour moves her feet out of the way. # passage:air-test # segment:air-test.p1
You trace the thread. The river below catches the light from the orchard, carrying little golden squares downstream. You want to learn this so badly that your chest hurts. # segment:air-test.p2
+ [Lift the apple with Thread of Air # choice:air-test.cast # game:test-air] -> air_result

=== air_result ===
{game_success:The apple floats into Nour's outstretched hand. She bows to it before taking a bite.|The apple drops into the river with a small, decisive splash. A fish catches it. Nour looks down and says that somebody, at least, is delighted.} # passage:air-result # segment:air-result.p1
Sélian asks what you felt just before it moved. He listens to your answer as though there is nothing else he would rather be doing. Then he gives you another apple. # segment:air-result.p2
“Your first lesson is yours now,” he says. “We can work on the landing.” # segment:air-result.p3
+ [Go to the Listening Garden # choice:air-result.next] -> cours_ecoute

=== cours_ecoute ===
Ysée's bees are carrying sparks of light between the flowers. Each makes a different note. Together they hold a low, steady chord around the garden. # passage:cours-ecoute # segment:cours-ecoute.p1
“A shield isn't a wall,” she says. “It's a note you keep steady while the rest of the world is loud.” She taps a spoon against a bowl. A pale ring spreads across the table and stops the falling petals. # segment:cours-ecoute.p2
You learn the counter-song under your breath. The watch in your pocket ticks along, despite its missing spring. # segment:cours-ecoute.p3
+ [Learn Counter-song # choice:cours-ecoute.learn # game:learn-shield] -> ecoute_test

=== ecoute_test ===
Nour lifts a watering can. “I volunteered. Apparently this makes me an excellent teaching assistant.” Above your head, a little sphere of water begins to tremble. # passage:ecoute-test # segment:ecoute-test.p1
Ysée gives you a nod. You hold the first note and feel the air gather around your shoulders. # segment:ecoute-test.p2
+ [Keep the note steady # choice:ecoute-test.cast # game:test-shield] -> ecoute_result

=== ecoute_result ===
{game_success:The water parts around you in a clear dome. On the other side, Nour is soaked. She looks so offended that you both start laughing.|The note slips. Cold water runs down your collar. Ysée hands you a towel with the solemn dignity of a medal.} # passage:ecoute-result # segment:ecoute-result.p1
Afterwards, the three of you drink tea in the grass. Nobody asks what school you went to before this one. Nobody minds that your coat is old. # segment:ecoute-result.p2
You are beginning to understand how a place can become precious in a single afternoon. # segment:ecoute-result.p3
+ [Follow the sound of turning pages # choice:ecoute-result.library] -> bibliotheque

=== bibliotheque ===
The library is built around a tree. Its shelves move a little when the branches stir. At a desk beneath the lowest bough, a stoneworker is repairing a book with mortar and a very small trowel. # passage:bibliotheque # segment:bibliotheque.p1
“Abel,” he says. “I keep the things that hold us together.” He shows you a drawing of the arch outside the school. There are six bright marks around it. One has faded. # segment:bibliotheque.p2
When you ask why, he closes the book gently. “An old door remembers being open. Sometimes we have to remind it what it is protecting.” # segment:bibliotheque.p3
~ met_abel = true
+ [Ask to learn a protective spell # choice:bibliotheque.ask # game:test-observation] -> formule

=== formule ===
Abel teaches you Dawnstroke: a short line of light, meant to loosen a broken enchantment before it hurts someone. You practise on a stubborn door knocker. It eventually lets go of the desk. # passage:formule # segment:formule.p1
“Use it to make room,” he says. “Never because you enjoy watching something break.” # segment:formule.p2
He fastens a small brass seal to a cord. On its face is a picture of the school with every window lit. “For the new arrival. Wearing it helps you find your way back.” # segment:formule.p3
+ [Learn Dawnstroke # choice:formule.learn # game:learn-dawn] -> sceau

=== sceau ===
You turn the seal over in your palm. On its back someone has scratched a name, then polished it away. It has belonged to other beginners. You find that comforting. # passage:sceau # segment:sceau.p1
Outside, Nour calls you to see the glasshouse before supper. Every pane is reflecting a different sunset. # segment:sceau.p2
+ [Keep the school seal # choice:sceau.keep # game:take-seal] -> serre

=== serre ===
In the glasshouse, seeds float over their pots like tiny sleeping birds. Nour is explaining how to tell which ones dream of trees when the afternoon chord stops. # passage:serre # segment:serre.p1
The silence hits hard enough to shake the floor. Every leaf turns towards the old arch. A crack runs through the nearest pane, slow and bright. # segment:serre.p2
Nour opens her mouth. No sound comes out. The missing note has taken her voice with it. # segment:serre.p3
+ [Take her hand # choice:serre.hand]
    ~ bond += 1
    -> fissure
+ [Look for the source of the silence # choice:serre.listen] -> fissure

=== fissure ===
At the arch, the faded mark is empty. A shape made of dust and broken light has unfolded from the stone. Every step it takes steals a sound: your shoes, a bird, the bell in the well. # passage:fissure # segment:fissure.p1
You reach for the note Ysée taught you. It is still there. So is the thread of air. Three hours ago you could not have imagined either. Now they are yours to use. # segment:fissure.p2
Nour squeezes your hand twice. Across the courtyard, you can see Ysée running towards you. You only need to hold the opening long enough. # segment:fissure.p3
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
Ysée wraps your hand in a warm cloth. “The door was frightened,” she says. “You heard it before any of us. Tomorrow we'll find out why.” # passage:infirmerie # segment:infirmerie.p1
Nour has dragged two bowls of soup into the room. She gives you the larger one. {bond > 1:Then she sits beside you, shoulder against yours.|Then she sits by the window, close enough to pass you bread.} # segment:infirmerie.p2
Abel leaves a new timetable on your pillow. Sélian has written a note beneath tomorrow's lesson: Apples provided. The bridge remains optional. # segment:infirmerie.p3
+ [Stay a while longer # choice:infirmerie.stay] -> promesse

=== promesse ===
Later, the orchard is full of lamps. Your watch lies open on the windowsill. Instead of a spring, a little thread of light turns patiently between its wheels. # passage:promesse # segment:promesse.p1
Your name has appeared on the room's door. Beneath it, three spaces are waiting on the timetable. You run your finger over them, already thinking of everything you want to learn. # segment:promesse.p2
+ [Begin with light and invention # choice:promesse.light]
    ~ calling = 1
    -> fin
+ [Learn how to protect the people here # choice:promesse.people]
    ~ calling = 2
    -> fin
+ [Find out what the old door remembers # choice:promesse.memory]
    ~ calling = 3
    -> fin

=== fin ===
Before bed, you write one sentence in a new notebook: I made a light today. # passage:fin # segment:fin.p1
Then you write another: There will be a lesson tomorrow. # segment:fin.p2
Outside, the school settles into its strange, ordinary noises. Nour wishes you goodnight. The watch keeps time. You leave its little light burning between the beds. # segment:fin.p3
Chapter I complete — Your place at Orée is yours. # segment:fin.p4
-> END
