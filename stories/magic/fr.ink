VAR met_nour = false
VAR met_ysee = false
VAR met_selyan = false
VAR met_abel = false
VAR bond = 0
VAR calling = 0
-> atelier

=== atelier ===
À vingt ans, tu sais réparer une horloge sans jamais avoir l'impression que le temps t'appartient. Chaque matin, les mêmes volets. Chaque soir, le même carré de ciel au-dessus de l'évier de l'atelier. # passage:atelier # segment:atelier.p1
Ce soir, une montre cassée se met à battre au fond d'un tiroir. Tu as retiré son ressort hier. Quand tu tends la main, toutes les autres horloges s'arrêtent. # segment:atelier.p2
Pendant une seconde impossible, tu entends quelqu'un rire de l'autre côté du mur. Le mur donne sur la rue. Il n'y a personne. # segment:atelier.p3
+ [Suivre ce rire impossible # choice:atelier.listen] -> messagere
+ [Sortir avec la montre # choice:atelier.watch] -> messagere

=== messagere ===
Une femme au manteau couvert de poussière attend sous l'auvent. Elle tient une lettre à deux mains, comme si quelque chose, à l'intérieur, risquait de s'envoler. # passage:messagere # segment:messagere.p1
« Je suis passée neuf fois devant cette boutique, dit-elle. Tu nous as enfin entendus. » Elle s'appelle Nour. Les gouttes de pluie restent immobiles sur sa manche. # segment:messagere.p2
Sur l'enveloppe, ton nom est écrit de ta propre main. En dessous : L'École des choses impossibles. Les admissions restent ouvertes jusqu'à la dernière lumière. # segment:messagere.p3
~ met_nour = true
+ [Accepter la lettre # choice:messagere.letter # game:take-letter] -> lettre

=== lettre ===
Le papier est tiède. Une phrase apparaît sous ton pouce : Tu as passé assez d'années à prendre ton don pour un défaut. # passage:lettre # segment:lettre.p1
À l'intérieur, un emploi du temps : le Jardin d'écoute, le Poids de l'air, l'Entretien des petites lumières. Aucun frais. Aucun examen de ta famille. Apporte quelque chose que tu as réparé. # segment:lettre.p2
Tu glisses la montre sans ressort dans ta poche. Pour la première fois depuis des mois, demain est difficile à imaginer. C'est une sensation merveilleuse. # segment:lettre.p3
+ [Demander s'il n'y a pas une erreur # choice:lettre.doubt]
    -> depart
+ [Dire à Nour que tu veux partir maintenant # choice:lettre.go]
    ~ bond += 1
    -> depart

=== depart ===
Tu laisses un mot pour l'équipe du matin. Sur ce papier-là, ton écriture reste ordinaire. Il te semble important de dire au revoir correctement, même à une vie devenue trop étroite. # passage:depart # segment:depart.p1
Nour te conduit après le dernier arrêt de bus. « Je livrais des colis, avant. Je croyais que les petites choses que je remarquais ne servaient à rien. Quelle lame de parquet une pièce essayait de cacher. Si une boîte fermée à clef se sentait seule. » # segment:depart.p2
Les lumières de la ville se raréfient derrière vous. Devant, un sentier traverse un champ qu'aucun plan de ta ville n'a jamais montré. Dans ta poche, la montre se met à battre contre ta paume. # segment:depart.p3
+ [Marcher près de Nour # choice:depart.together]
    ~ bond += 1
    -> chemin
+ [Regarder la ville une dernière fois # choice:depart.look] -> chemin

=== chemin ===
La pointe des herbes est argentée. Au loin, une porte de pierre se dresse sans mur autour d'elle. Dans son ouverture, il fait jour, alors que le soleil, derrière vous, vient de disparaître. # passage:chemin # segment:chemin.p1
« Pose la montre sur le seuil, murmure Nour. Puis demande le temps que tu n'as pas encore vécu. » # segment:chemin.p2
Tu manques de rire. Alors la porte répond par le bruit entendu dans l'atelier : des rires, des couverts qui tintent, quelqu'un qui joue très mal d'un instrument. Toute une vie, juste derrière la pierre. # segment:chemin.p3
+ [Demander ton temps encore à écrire # choice:chemin.open] -> passage

=== passage ===
La porte exhale un souffle chaud. Mille clochettes minuscules résonnent dans la pierre. Ta montre déroule un fil de lumière et le tend à travers l'ouverture. # passage:passage # segment:passage.p1
Tu passes le seuil. # segment:passage.p2
+ [Découvrir ce qui t'attend # choice:passage.cross] -> cour

=== cour ===
De l'autre côté, l'école grimpe sur la colline en terrasses irrégulières : maisons de bois, passerelles couvertes, tour aux fenêtres pleines de plantes. Quelqu'un a suspendu un hamac entre deux cheminées. # passage:cour # segment:cour.p1
Au-dessus de la cour, une jeune femme essaie de convaincre un nuage de quitter sa corbeille à linge. Une cloche sonne au fond du puits. À une fenêtre, une tasse se remplit toute seule, déborde et déclenche des applaudissements furieux. # segment:cour.p2
Tu restes immobile. Toutes les petites choses étranges et inutiles que tu cachais depuis des années ressemblent soudain au commencement d'une langue. # segment:cour.p3
« Orée, dit Nour. Chez toi, si tu veux. » # segment:cour.p4
+ [Lui dire que tu le veux # choice:cour.home]
    ~ bond += 1
    -> chambre
+ [Demander quand commencent les cours # choice:cour.lessons] -> chambre

=== chambre ===
Ta chambre sent le cèdre et le linge propre. Deux lits, deux bureaux, une fenêtre sur un verger. Sur l'armoire, un petit mot : Merci de frapper avant d'ouvrir. # passage:chambre # segment:chambre.p1
Nour pose son sac sur l'autre lit. « J'ai demandé quelqu'un que les questions ne dérangeraient pas. » Elle hésite. « Tu peux changer de chambre, si tu préfères. » # segment:chambre.p2
En bas, on prépare une longue table pour le dîner. Personne ne te rappelle à l'atelier. Personne ne vient dire qu'il y a eu une erreur. # segment:chambre.p3
+ [Poser la montre sur le bureau et rester # choice:chambre.stay] -> relais

=== relais ===
La directrice s'occupe d'un panier d'abeilles dans le Jardin d'écoute. Son tablier porte des traces de brûlure ; elle a de l'encre sur l'arête du nez. « Ysée Valambre. Évite de m'appeler enchanteresse, je te prie. Ça encourage les abeilles. » # passage:relais # segment:relais.p1
Elle te fait prendre une bougie froide. « La magie commence par l'attention. Offre à cette petite chose un endroit où avoir chaud. » # segment:relais.p2
Tu penses à l'atelier en hiver. Aux doigts raidis par le froid. À toutes les fois où tu aurais aimé que quelqu'un laisse une lumière pour toi. # segment:relais.p3
~ met_ysee = true
+ [Apprendre Petite Lumière # choice:relais.learn # game:learn-light] -> lueur

=== lueur ===
Une flamme s'ouvre au-dessus de la mèche. Elle ne chauffe pas, mais sa lumière se pose sur tes mains comme du soleil à travers un rideau. C'est toi qui fais cela. Tu es encore en train de le faire. # passage:lueur # segment:lueur.p1
Ysée laisse durer le silence. Puis elle dépose un stylet d'aulne à côté de la bougie. « Pour écrire des invitations au monde. Certains préfèrent une baguette. D'autres chantent. Un bon outil t'aide à entendre ta propre intention. » # segment:lueur.p2
Ta main tremble en le prenant. Nour te sourit de toutes ses dents, près du portail du jardin. # segment:lueur.p3
+ [Prendre ton premier outil magique # choice:lueur.pen # game:take-pen] -> cours_air

=== cours_air ===
Ta première salle de classe est une passerelle. Sélian, le passeur de l'école, pose une pomme sur la rambarde. Des graines emportées par le vent se sont prises dans sa barbe. # passage:cours-air # segment:cours-air.p1
« Les choses tombent parce qu'elles ont un endroit où aller. Propose-leur une autre destination. » Il dessine un fil dans l'air avec le doigt. La pomme monte. Une feuille la suit, pleine d'espoir. # segment:cours-air.p2
Tu reproduis le geste avec ton stylet. Une ligne fine et fraîche appuie contre tes doigts. Un instant, tu sens le poids de la pomme aussi nettement que ton propre cœur. # segment:cours-air.p3
~ met_selyan = true
+ [Apprendre Fil d'air # choice:cours-air.learn # game:learn-air] -> air_test

=== air_test ===
Sélian repose la pomme sur la rambarde. « Jusqu'à l'autre côté. Essaie de laisser la passerelle à sa place. » Nour écarte prudemment les pieds. # passage:air-test # segment:air-test.p1
Tu traces le fil. En bas, la rivière attrape la lumière du verger et emporte de petits carrés d'or. Tu as tellement envie d'apprendre cela que ta poitrine te fait mal. # segment:air-test.p2
+ [Soulever la pomme avec Fil d'air # choice:air-test.cast # game:test-air] -> air_result

=== air_result ===
{game_success:La pomme flotte jusque dans la main tendue de Nour. Elle la salue avant d'y mordre.|La pomme tombe dans la rivière avec un petit bruit définitif. Un poisson l'attrape. Nour se penche et déclare que quelqu'un, au moins, est ravi.} # passage:air-result # segment:air-result.p1
Sélian te demande ce que tu as senti juste avant qu'elle bouge. Il écoute ta réponse comme s'il n'avait rien de plus intéressant à faire. Puis il te donne une autre pomme. # segment:air-result.p2
« Ta première leçon t'appartient, maintenant. Pour l'atterrissage, on a le temps. » # segment:air-result.p3
+ [Aller au Jardin d'écoute # choice:air-result.next] -> cours_ecoute

=== cours_ecoute ===
Les abeilles d'Ysée transportent des étincelles entre les fleurs. Chacune produit une note différente. Ensemble, elles maintiennent un accord grave et régulier autour du jardin. # passage:cours-ecoute # segment:cours-ecoute.p1
« Un bouclier, c'est une note que tu tiens pendant que le reste du monde fait du bruit. » Elle frappe une cuillère contre un bol. Un cercle pâle s'étend sur la table et arrête les pétales qui tombent. # segment:cours-ecoute.p2
Tu apprends le contre-chant à voix basse. Dans ta poche, la montre bat la mesure malgré son ressort absent. # segment:cours-ecoute.p3
+ [Apprendre Contre-chant # choice:cours-ecoute.learn # game:learn-shield] -> ecoute_test

=== ecoute_test ===
Nour lève un arrosoir. « Je me suis portée volontaire. Apparemment, ça fait de moi une excellente assistante. » Au-dessus de ta tête, une petite sphère d'eau se met à trembler. # passage:ecoute-test # segment:ecoute-test.p1
Ysée t'adresse un signe. Tu tiens la première note et tu sens l'air se rassembler autour de tes épaules. # segment:ecoute-test.p2
+ [Tenir la note # choice:ecoute-test.cast # game:test-shield] -> ecoute_result

=== ecoute_result ===
{game_success:L'eau se sépare autour de toi en un dôme transparent. De l'autre côté, Nour est trempée. Elle a l'air si offensée que vous éclatez de rire.|La note glisse. De l'eau froide coule dans ton col. Ysée te tend une serviette avec la dignité solennelle d'une remise de médaille.} # passage:ecoute-result # segment:ecoute-result.p1
Ensuite, vous buvez du thé dans l'herbe, tous les trois. Personne ne te demande dans quelle école tu allais avant celle-ci. Personne ne trouve ton manteau trop vieux. # segment:ecoute-result.p2
Tu commences à comprendre comment un lieu peut devenir précieux en un seul après-midi. # segment:ecoute-result.p3
+ [Suivre le bruit des pages # choice:ecoute-result.library] -> bibliotheque

=== bibliotheque ===
La bibliothèque a été construite autour d'un arbre. Ses rayonnages bougent un peu quand les branches frémissent. Sous la branche la plus basse, un tailleur de pierre répare un livre avec du mortier et une très petite truelle. # passage:bibliotheque # segment:bibliotheque.p1
« Abel. Je m'occupe de ce qui nous tient ensemble. » Il te montre un dessin de l'arche devant l'école. Six marques claires l'entourent. L'une d'elles s'est effacée. # segment:bibliotheque.p2
Quand tu lui demandes pourquoi, il referme doucement le livre. « Une vieille porte se souvient d'avoir été ouverte. Il faut parfois lui rappeler ce qu'elle protège. » # segment:bibliotheque.p3
~ met_abel = true
+ [Demander un sort de protection # choice:bibliotheque.ask # game:test-observation] -> formule

=== formule ===
Abel t'enseigne Trait d'aube : un bref trait de lumière qui desserre un enchantement abîmé avant qu'il blesse quelqu'un. Tu t'exerces sur un heurtoir obstiné. Il finit par lâcher le bureau. # passage:formule # segment:formule.p1
« Sers-t'en pour faire de la place. Jamais pour le plaisir de voir quelque chose se briser. » # segment:formule.p2
Il attache un petit sceau de laiton à un cordon. Sur sa face, l'école a toutes ses fenêtres allumées. « Pour la nouvelle arrivée. Le porter aide à retrouver son chemin. » # segment:formule.p3
+ [Apprendre Trait d'aube # choice:formule.learn # game:learn-dawn] -> sceau

=== sceau ===
Tu retournes le sceau dans ta paume. Au dos, quelqu'un a gravé un nom, puis l'a poli jusqu'à l'effacer. Il a appartenu à d'autres débutants. Cette pensée te réconforte. # passage:sceau # segment:sceau.p1
Dehors, Nour t'appelle : elle veut te montrer la serre avant le dîner. Chaque carreau reflète un coucher de soleil différent. # segment:sceau.p2
+ [Garder le sceau de l'école # choice:sceau.keep # game:take-seal] -> serre

=== serre ===
Dans la serre, les graines flottent au-dessus des pots comme de minuscules oiseaux endormis. Nour t'explique comment reconnaître celles qui rêvent d'arbres quand l'accord de l'après-midi s'interrompt. # passage:serre # segment:serre.p1
Le silence frappe assez fort pour ébranler le sol. Toutes les feuilles se tournent vers la vieille arche. Une fêlure traverse le carreau le plus proche, lente et brillante. # segment:serre.p2
Nour ouvre la bouche. Aucun son n'en sort. La note manquante a emporté sa voix. # segment:serre.p3
+ [Prendre sa main # choice:serre.hand]
    ~ bond += 1
    -> fissure
+ [Chercher la source du silence # choice:serre.listen] -> fissure

=== fissure ===
À l'arche, la marque effacée est vide. Une forme de poussière et de lumière brisée s'est dépliée hors de la pierre. Chacun de ses pas vole un bruit : tes chaussures, un oiseau, la cloche du puits. # passage:fissure # segment:fissure.p1
Tu retrouves la note enseignée par Ysée. Elle est toujours là. Le fil d'air aussi. Il y a trois heures, tu n'aurais pas pu les imaginer. Maintenant, tu peux t'en servir. # segment:fissure.p2
Nour serre deux fois ta main. À l'autre bout de la cour, tu vois Ysée courir vers vous. Il faut seulement tenir l'ouverture assez longtemps. # segment:fissure.p3
+ [Faire face au gardien brisé # choice:fissure.face # game:test-courage] -> gardien

=== gardien ===
Le gardien barre le sentier étroit. De la lumière s'échappe des fentes de sa poitrine. Il essaie de fermer une porte qui n'entre plus dans son cadre. # passage:gardien # segment:gardien.p1
Tu lèves le stylet d'aulne. Tu peux frapper avec lui, utiliser Trait d'aube pour dénouer l'enchantement ou reculer vers Ysée. Nour reste assez près pour que tu sentes sa main sur ta manche. # segment:gardien.p2
+ [Tenir le passage # choice:gardien.fight # game:guardian] -> apres

=== apres ===
{game_success:Ton dernier trait atteint la marque vide. Le gardien se replie en une pluie de poussière inoffensive. Pendant un battement de cœur, toute la cour s'illumine.|Ysée te rejoint dans l'air silencieux et plante son bâton sur le seuil. Nour te rattrape par le bras pendant que le gardien se referme autour de sa lumière.} # passage:apres # segment:apres.p1
Le premier bruit qui revient est l'inspiration de Nour. « Ça, dit-elle d'une voix tremblante, ce n'était pas sur l'emploi du temps. » # segment:apres.p2
Puis les cloches sonnent, les abeilles reprennent leur accord et l'école semble respirer autour de toi. Ta main te fait mal. Jamais le bruit d'une foule ne t'a fait autant plaisir. # segment:apres.p3
+ [Laisser Ysée soigner tes blessures # choice:apres.rest # game:recover] -> infirmerie

=== infirmerie ===
Ysée enveloppe ta main dans un linge chaud. « La porte avait peur. Tu l'as entendue avant nous tous. Demain, nous chercherons pourquoi. » # passage:infirmerie # segment:infirmerie.p1
Nour a apporté deux bols de soupe. Elle te donne le plus grand. {bond > 1:Puis elle s'assoit contre toi, épaule contre épaule.|Puis elle s'assoit près de la fenêtre, assez près pour te passer le pain.} # segment:infirmerie.p2
Abel laisse un nouvel emploi du temps sur ton oreiller. Sous la leçon du lendemain, Sélian a ajouté : Pommes fournies. La passerelle reste facultative. # segment:infirmerie.p3
+ [Rester encore un moment # choice:infirmerie.stay] -> promesse

=== promesse ===
Plus tard, le verger est plein de lampes. Ta montre est ouverte sur l'appui de la fenêtre. À la place du ressort, un petit fil de lumière tourne patiemment entre les rouages. # passage:promesse # segment:promesse.p1
Ton nom est apparu sur la porte de la chambre. En dessous, trois cases attendent sur l'emploi du temps. Tu passes le doigt dessus, déjà en train de penser à tout ce que tu veux apprendre. # segment:promesse.p2
+ [Commencer par la lumière et l'invention # choice:promesse.light]
    ~ calling = 1
    -> fin
+ [Apprendre à protéger les gens d'ici # choice:promesse.people]
    ~ calling = 2
    -> fin
+ [Découvrir ce que l'ancienne porte se rappelle # choice:promesse.memory]
    ~ calling = 3
    -> fin

=== fin ===
Avant de dormir, tu écris une phrase dans un carnet neuf : Aujourd'hui, j'ai fait de la lumière. # passage:fin # segment:fin.p1
Puis tu en écris une autre : Demain, il y aura un cours. # segment:fin.p2
Dehors, l'école retrouve ses bruits étranges et ordinaires. Nour te souhaite bonne nuit. La montre continue de battre. Tu laisses sa petite lumière allumée entre les deux lits. # segment:fin.p3
Chapitre I terminé — Ta place à Orée t'appartient. # segment:fin.p4
-> END
