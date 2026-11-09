VAR met_nour = false
VAR met_ysee = false
VAR met_selyan = false
VAR met_abel = false
VAR bond = 0
VAR calling = 0
VAR read_warning = false
-> matin_ville

=== matin_ville ===
Le mercredi, tu ouvres l'atelier avant monsieur Varenne. Il faut remonter la grande pendule, balayer les copeaux sous l'établi et mettre l'eau à chauffer. Tu as vingt ans, une chambre au-dessus de la boutique et de l'huile d'horlogerie jusque dans les coutures de tes manches. # passage:matin-ville # segment:matin-ville.p1
Ce matin, tu descends d'abord au canal. La boulangère t'a gardé deux petits pains ; le second est pour Varenne, qui prétend avoir déjà déjeuné et le mange toujours avant neuf heures. Sur le pont, tu t'arrêtes pour laisser passer un homme avec une brouette. Une péniche racle lentement la rive. # segment:matin-ville.p2
En revenant, tu comptes les courses de la journée sur tes doigts : livrer la pendule de madame Arnal, acheter un ressort de montre, réclamer les six sous que le marchand de charbon vous doit depuis lundi. Tu as oublié ton carnet. Il faudra tout retenir. # segment:matin-ville.p3
+ [Rentrer avant que l'eau déborde # choice:matin-ville.home] -> etabli

=== etabli ===
Varenne est déjà assis à l'établi. Il a posé devant toi la montre que tu n'as pas réussi à réparer hier. « Montre-moi ce qui résiste. » Tu ouvres le boîtier et disposes les pièces sur un linge blanc, dans l'ordre où tu les as retirées. # passage:etabli # segment:etabli.p1
Le ressort est fendu. Tu l'enlèves avec la pince, puis tu vérifies l'axe du balancier. Varenne te laisse chercher avant de rapprocher sa lampe. « Là. Regarde le bord. » Il y a une encoche si petite que tu l'aurais prise pour un reflet. # segment:etabli.p2
Tu voudrais savoir réparer sans qu'il soit obligé de te montrer. Il te donne une lime fine. « Moi aussi, quelqu'un m'a montré. À toi de faire la suite. » Quand la cloche du marché sonne, l'axe est enfin lisse et tes deux petits pains ont disparu. # segment:etabli.p3
+ [Emballer la pendule pour la livraison # choice:etabli.delivery] -> livraison

=== livraison ===
Madame Arnal habite au bout du quai, au quatrième sans ascenseur. Elle ouvre avant que tu frappes : elle surveillait la fenêtre. Tu poses sa pendule sur la cheminée et attends avec elle les douze coups de midi. Au huitième, elle commence à compter sur ses doigts, pour vérifier. # passage:livraison # segment:livraison.p1
Elle te paie, puis t'enveloppe une part de tarte pour Varenne. « Dis-lui que je tiens à l'heure juste. » Sur le chemin du retour, tu passes chez le fournisseur. Il n'aura le ressort de montre que vendredi. Tu sais déjà que le client demandera pourquoi cela prend si longtemps. # segment:livraison.p2
La pluie commence pendant que tu traverses le pont. Tu glisses la tarte sous ton manteau et cours jusqu'à la boutique. Varenne prépare son sac : il part régler une horloge à la gare. Il te laisse les clés et te demande de fermer à six heures. # segment:livraison.p3
+ [Terminer les réparations de l'après-midi # choice:livraison.work] -> atelier

=== atelier ===
Vers six heures, tu ranges les outils et termines la liste des pièces à commander. Depuis quelques semaines, certaines horloges se remettent à marcher avant même que tu aies terminé de les remonter. Tu as pensé à une erreur de réglage. Cet après-midi, c'est arrivé deux fois. # passage:atelier # segment:atelier.p1
Ce soir, une montre cassée se met à battre au fond d'un tiroir. Tu as retiré son ressort hier. Quand tu tends la main, toutes les autres horloges s'arrêtent. # segment:atelier.p2
Pendant une seconde impossible, tu entends quelqu'un rire de l'autre côté du mur. Le mur donne sur la rue. Il n'y a personne. # segment:atelier.p3
+ [Suivre ce rire impossible # choice:atelier.listen] -> messagere
+ [Sortir avec la montre # choice:atelier.watch] -> messagere

=== messagere ===
Une femme au manteau couvert de poussière attend sous l'auvent. Elle tient une lettre à deux mains, comme si quelque chose, à l'intérieur, risquait de s'envoler. # passage:messagere # segment:messagere.p1
« J'ai fait neuf livraisons dans cette rue avant de trouver ta boutique. Les horloges m'ont guidée. » Elle s'appelle Nour et étudie à Orée. Tu lui demandes pourquoi les gouttes de pluie restent suspendues sur sa manche. Elle souffle dessus ; elles tombent sur tes chaussures. « Pardon. J'oublie toujours de défaire ce sort. » # segment:messagere.p2
Sur l'enveloppe, ton nom apparaît lettre après lettre. En dessous : École de sorcellerie d'Orée, bureau des admissions. Tu reconnais ton écriture. Nour remarque ton regard : « Le papier copie la main de la personne qui le tient. C'est notre façon de vérifier le destinataire. » # segment:messagere.p3
~ met_nour = true
+ [Accepter la lettre # choice:messagere.letter # game:take-letter] -> preuve

=== lettre ===
La lettre commence par une invitation à suivre trois jours de cours à Orée. La directrice, Ysée Valambre, a signé en bas. Dans la marge, une petite flèche se déplace jusqu'à la ligne que tu es en train de lire. # passage:lettre # segment:lettre.p1
À l'intérieur, un emploi du temps : le Jardin d'écoute, le Poids de l'air, l'Entretien des petites lumières. Aucun frais. Aucun examen de ta famille. Apporte quelque chose que tu as réparé. # segment:lettre.p2
Tu vérifies les horaires : Nour doit rejoindre le passage de la gare avant la tombée de la nuit. Il reste une heure. Tu ranges la montre sans ressort dans son étui, prends ton manteau et demandes où tu pourras écrire à monsieur Varenne. # segment:lettre.p3
+ [Demander s'il n'y a pas une erreur # choice:lettre.doubt]
    -> depart
+ [Dire à Nour que tu veux partir maintenant # choice:lettre.go]
    ~ bond += 1
    -> depart

=== depart ===
Tu laisses un mot sur l'établi : tu pars visiter une école avec Nour et tu écriras dès demain. Tu ajoutes son adresse, puis la tienne, au cas où. Avant de fermer, tu vérifies le gaz et tournes la pancarte de la boutique. # passage:depart # segment:depart.p1
En marchant, Nour te raconte son arrivée à Orée, un an plus tôt. Elle livrait des colis et savait retrouver les adresses effacées : il lui suffisait de tenir le paquet. Son patron appelait cela de la chance. Une enseignante lui a montré qu'elle pouvait faire apparaître les lettres disparues. # segment:depart.p2
Les lumières de la ville se raréfient derrière vous. Devant, une fenêtre brille dans l'ancienne gare abandonnée. Dans ta poche, la montre se met à battre contre ta paume. # segment:depart.p3
+ [Marcher près de Nour # choice:depart.together]
    ~ bond += 1
    -> ville
+ [Regarder la ville une dernière fois # choice:depart.look] -> ville

=== chemin ===
La pointe des herbes est argentée. Au loin, une porte de pierre se dresse sans mur autour d'elle. Dans son ouverture, il fait jour, alors que le soleil, derrière vous, vient de disparaître. # passage:chemin # segment:chemin.p1
« Pose la montre sur le seuil. Il faut apporter un objet qu'on a réparé pour entrer la première fois. » Nour t'indique une encoche dans la pierre. « Ensuite, dis ton nom et demande à entrer à Orée. L'arche gardera ton empreinte, pas la montre. » # segment:chemin.p2
Tu manques de rire. Alors la porte répond par le bruit entendu dans l'atelier : des rires, des couverts qui tintent, quelqu'un qui joue très mal d'un instrument. Toute une vie, juste derrière la pierre. # segment:chemin.p3
+ [Poser la montre sur le seuil et demander à entrer # choice:chemin.open] -> passage

=== passage ===
La porte exhale un souffle chaud. Mille clochettes minuscules résonnent dans la pierre. Ta montre déroule un fil de lumière et le tend à travers l'ouverture. # passage:passage # segment:passage.p1
Tu passes le seuil. # segment:passage.p2
+ [Découvrir ce qui t'attend # choice:passage.cross] -> cour

=== cour ===
De l'autre côté, l'école grimpe sur la colline en terrasses irrégulières : maisons de bois, passerelles couvertes, tour aux fenêtres pleines de plantes. Quelqu'un a suspendu un hamac entre deux cheminées. # passage:cour # segment:cour.p1
Au-dessus de la cour, une jeune femme essaie de convaincre un nuage de quitter sa corbeille à linge. Une cloche sonne au fond du puits. À une fenêtre, une tasse se remplit toute seule, déborde et déclenche des applaudissements furieux. # segment:cour.p2
Tu fixes la tasse qui se remplit sans qu'on la touche. Ce matin encore, tu aurais cherché un tuyau caché dans le mur. Tu demandes à Nour combien de cours il faut pour apprendre cela. « Beaucoup moins que pour lui apprendre à s'arrêter », répond-elle. # segment:cour.p3
« Orée, dit Nour. Chez toi, si tu veux. » # segment:cour.p4
+ [Lui dire que tu le veux # choice:cour.home]
    ~ bond += 1
    -> refectoire
+ [Demander quand commencent les cours # choice:cour.lessons] -> refectoire

=== chambre ===
Ta chambre sent le cèdre et le linge propre. Deux lits, deux bureaux, une fenêtre sur un verger. Sur l'armoire, un petit mot : Merci de frapper avant d'ouvrir. # passage:chambre # segment:chambre.p1
Nour pose son sac sur l'autre lit. « J'ai demandé quelqu'un que les questions ne dérangeraient pas. » Elle hésite. « Tu peux changer de chambre, si tu préfères. » # segment:chambre.p2
En bas, les bols du dîner se lavent tout seuls. Personne ne te rappelle à l'atelier. Personne ne vient dire qu'il y a eu une erreur. # segment:chambre.p3
+ [Poser la montre sur le bureau et rester # choice:chambre.stay] -> matin

=== relais ===
La directrice s'occupe d'un panier d'abeilles dans le Jardin d'écoute. Son tablier porte des traces de brûlure ; elle a de l'encre sur l'arête du nez. « Ysée Valambre. Évite de m'appeler enchanteresse, je te prie. Ça encourage les abeilles. » # passage:relais # segment:relais.p1
Ysée pose une bougie froide sur une soucoupe. « Pour Petite Lueur, vise le bout de la mèche et tiens ta main immobile. Imagine un point lumineux, pas une flamme : nous voulons éclairer, pas brûler. Si ça chauffe, ouvre la main et recommence. » # segment:relais.p2
Elle fait la démonstration. Une perle blanche apparaît au-dessus de la mèche ; tu peux passer un doigt à travers sans te brûler. À ton premier essai, tu n'obtiens qu'une étincelle. Ysée rapproche la soucoupe et te fait recommencer en respirant plus lentement. # segment:relais.p3
~ met_ysee = true
+ [Apprendre Petite Lumière # choice:relais.learn # game:learn-light] -> lueur

=== lueur ===
Une flamme s'ouvre au-dessus de la mèche. Elle ne chauffe pas, mais sa lumière se pose sur tes mains comme du soleil à travers un rideau. C'est toi qui fais cela. Tu es encore en train de le faire. # passage:lueur # segment:lueur.p1
Ysée te fait éteindre puis rallumer la lueur trois fois. Ensuite, elle te prête un stylet d'aulne. « Tu peux lancer un sort à mains nues. Le bois aide à diriger le geste, comme une règle aide à tracer droit. Garde la pointe loin des yeux. » # segment:lueur.p2
Ta main tremble en le prenant. Nour te sourit de toutes ses dents, près du portail du jardin. # segment:lueur.p3
+ [Prendre ton premier outil magique # choice:lueur.pen # game:take-pen] -> cours_air

=== cours_air ===
Ta première salle de classe est une passerelle. Sélian, le passeur de l'école, pose une pomme sur la rambarde. Des graines emportées par le vent se sont prises dans sa barbe. # passage:cours-air # segment:cours-air.p1
Sélian passe une main sous la pomme sans la toucher. Un fil presque transparent la soulève de quelques centimètres. « Le fil relie ta main à l'objet. Tire doucement et garde la même distance. Si tu tires d'un coup, elle part comme une pierre de fronde. » # segment:cours-air.p2
Tu reproduis le geste avec ton stylet. Une ligne fine et fraîche appuie contre tes doigts. Un instant, tu sens le poids de la pomme aussi nettement que ton propre cœur. # segment:cours-air.p3
~ met_selyan = true
+ [Apprendre Fil d'air # choice:cours-air.learn # game:learn-air] -> air_test

=== air_test ===
Sélian repose la pomme sur la rambarde. « Jusqu'à l'autre côté. Essaie de laisser la passerelle à sa place. » Nour écarte prudemment les pieds. # passage:air-test # segment:air-test.p1
Tu traces le fil. En bas, la rivière attrape la lumière du verger et emporte de petits carrés d'or. Tu as tellement envie d'apprendre cela que ta poitrine te fait mal. # segment:air-test.p2
+ [Essayer de soulever la pomme avec la capacité Fil d'air # choice:air-test.cast # game:test-air] -> air_result

=== air_result ===
{game_success:La pomme quitte la rambarde, hésite au-dessus de l'eau, puis rejoint la main tendue de Nour. Elle la rattrape avec les deux mains. « Tu peux lâcher maintenant. » Tu desserres les doigts ; elle reçoit enfin tout son poids.|Le fil se détend trop tôt. La pomme heurte la rambarde et tombe à l'eau. Vous la regardez dériver sous le pont. Sélian pose une main sur ton poignet : « Tu as tourné la main avant qu'elle arrive. On reprend d'ici. »} # passage:air-result # segment:air-result.p1
Sélian te demande ce que tu as senti juste avant qu'elle bouge. Il écoute ta réponse comme s'il n'avait rien de plus intéressant à faire. Puis il te donne une autre pomme. # segment:air-result.p2
« Ta première leçon t'appartient, maintenant. Pour l'atterrissage, on a le temps. » # segment:air-result.p3
+ [Aller au Jardin d'écoute # choice:air-result.next] -> reparation

=== cours_ecoute ===
Les abeilles d'Ysée transportent des étincelles entre les fleurs. Chacune produit une note différente. Ensemble, elles maintiennent un accord grave et régulier autour du jardin. # passage:cours-ecoute # segment:cours-ecoute.p1
« Le Contre-chant forme un bouclier tant que tu tiens la note. » Ysée frappe un bol avec sa cuillère et chante au même ton. Un anneau pâle s'étend autour d'elle ; les pétales qui tombent glissent sur sa surface. Elle s'interrompt : l'anneau disparaît aussitôt. # segment:cours-ecoute.p2
Tu apprends le contre-chant à voix basse. Dans ta poche, la montre bat la mesure malgré son ressort absent. # segment:cours-ecoute.p3
+ [Apprendre Contre-chant # choice:cours-ecoute.learn # game:learn-shield] -> ecoute_test

=== ecoute_test ===
Nour lève un arrosoir. « Je me suis portée volontaire. Apparemment, ça fait de moi une excellente assistante. » Au-dessus de ta tête, une petite sphère d'eau se met à trembler. # passage:ecoute-test # segment:ecoute-test.p1
Ysée t'adresse un signe. Tu tiens la première note et tu sens l'air se rassembler autour de tes épaules. # segment:ecoute-test.p2
+ [Tenir la note # choice:ecoute-test.cast # game:test-shield] -> ecoute_result

=== ecoute_result ===
{game_success:L'eau se sépare autour de toi en un dôme transparent. De l'autre côté, Nour est trempée. Elle a l'air si offensée que vous éclatez de rire.|La note glisse. De l'eau froide coule dans ton col. Ysée te tend une serviette avec la dignité solennelle d'une remise de médaille.} # passage:ecoute-result # segment:ecoute-result.p1
Ensuite, vous buvez du thé dans l'herbe, tous les trois. Personne ne te demande dans quelle école tu allais avant celle-ci. Personne ne trouve ton manteau trop vieux. # segment:ecoute-result.p2
Ysée note tes progrès sur une fiche, puis vous confie les bols à rapporter à la bibliothèque. Abel vous y attend pour expliquer le fonctionnement des passages. Nour prend les serviettes encore mouillées ; tu portes les bols à deux mains, sans utiliser de sort cette fois. # segment:ecoute-result.p3
+ [Suivre le bruit des pages # choice:ecoute-result.library] -> bibliotheque

=== bibliotheque ===
La bibliothèque a été construite autour d'un arbre. Ses rayonnages bougent un peu quand les branches frémissent. Sous la branche la plus basse, un tailleur de pierre répare un livre avec du mortier et une très petite truelle. # passage:bibliotheque # segment:bibliotheque.p1
« Abel, responsable des passages. » Il te montre le plan de l'arche que tu as traversée. Six inscriptions entourent l'ouverture. « Chacune remplit une fonction : reconnaître les élèves, choisir la destination, garder le passage ouvert… Celle-ci règle la fermeture. » # segment:bibliotheque.p2
Il pose une loupe sur une marque pâlie. « La pluie a usé plusieurs lettres. Nous avons fermé l'accès extérieur hier pour réparer. L'arche relie aussi la serre au jardin ; les lampes vertes indiquent que ce trajet reste sûr. » Sous la loupe, tu remarques une ligne que le dessinateur a presque effacée. # segment:bibliotheque.p3
~ met_abel = true
+ [Examiner le dessin de l'arche # choice:bibliotheque.ask # game:test-observation] -> archives

=== formule ===
Abel t'enseigne Trait d'aube : un bref trait de lumière qui desserre un enchantement abîmé avant qu'il blesse quelqu'un. Tu t'exerces sur un heurtoir obstiné. Il finit par lâcher le bureau. # passage:formule # segment:formule.p1
« Sers-t'en pour faire de la place. Jamais pour le plaisir de voir quelque chose se briser. » # segment:formule.p2
Il attache un petit sceau de laiton à un cordon. Sur sa face, l'école a toutes ses fenêtres allumées. « Pour notre nouvelle recrue. Le porter aide à retrouver son chemin. » # segment:formule.p3
+ [Apprendre Trait d'aube # choice:formule.learn # game:learn-dawn] -> sceau

=== sceau ===
Tu retournes le sceau dans ta paume. Au dos, quelqu'un a gravé un nom, puis l'a poli jusqu'à l'effacer. Il a appartenu à d'autres débutants. Cette pensée te réconforte. # passage:sceau # segment:sceau.p1
Dehors, Nour t'appelle : elle veut te montrer la serre avant le dîner. Chaque carreau reflète un coucher de soleil différent. # segment:sceau.p2
+ [Garder le sceau de l'école # choice:sceau.keep # game:take-seal] -> entrainement

=== serre ===
Derrière Nour, les pots de la serre vibrent sur leurs étagères. La porte commence à se refermer alors que personne ne la touche. Tu tires plus fort, mais sa manche semble retenue à l'intérieur de la pierre. # passage:serre # segment:serre.p1
Le silence frappe assez fort pour ébranler le sol. Toutes les feuilles se tournent vers la vieille arche. Une fêlure traverse le carreau le plus proche, lente et brillante. # segment:serre.p2
Nour essaie d'appeler Abel. Aucun son ne sort. La marque effacée brille au rythme de ses lèvres : l'arche a capté sa voix. Tu lui demandes de ne plus parler et de garder les pieds hors du seuil. Elle acquiesce, les yeux fixés sur la pierre. # segment:serre.p3
+ [Prendre sa main # choice:serre.hand]
    ~ bond += 1
    -> fissure
+ [Chercher la source du silence # choice:serre.listen] -> fissure

=== fissure ===
Une silhouette de pierre se détache du montant de l'arche. Une fissure lumineuse traverse sa poitrine. À mesure qu'elle avance, tu n'entends plus tes pas, puis plus la cloche du puits. Le sol tremble pourtant sous ses pieds. Tu recules avec Nour jusqu'à la première marche de la serre. # passage:fissure # segment:fissure.p1
Tu retrouves la note enseignée par Ysée. Elle est toujours là. Le fil d'air aussi. Trois jours plus tôt, tu n'aurais pas pu les imaginer. Maintenant, tu peux t'en servir. {read_warning:Tu reconnais le mot arraché : la porte a pris une voix pour combler son manque. Il faut dénouer la marque, pas détruire l'arche.|Tu te rappelles l'avertissement d'Abel : la porte essaie de se refermer sur une voix vivante.} # segment:fissure.p2
Ysée arrive de l'autre côté de la cour. Elle te crie de maintenir le passage pendant qu'Abel coupe l'alimentation des lampes. Tu as besoin de gagner quelques secondes, pas de réparer l'arche. Nour serre deux fois ta main pour te montrer qu'elle a compris. # segment:fissure.p3
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
Ysée enveloppe ta main dans un linge chaud. « Le joint a cédé avant la pose des barrières. Abel avait donné l'alerte ; nous n'avons pas condamné le passage assez vite. Demain, nous vérifierons toutes les arches. » Elle attend que tu bouges les doigts avant de resserrer le bandage. # passage:infirmerie # segment:infirmerie.p1
Nour a apporté deux bols de soupe. Elle te donne le plus grand. {bond > 1:Puis elle s'assoit contre toi, épaule contre épaule.|Puis elle s'assoit près de la fenêtre, assez près pour te passer le pain.} # segment:infirmerie.p2
Abel laisse un nouvel emploi du temps sur ton oreiller. Sous la leçon du lendemain, Sélian a ajouté : Pommes fournies. La passerelle reste facultative. # segment:infirmerie.p3
+ [Rester encore un moment # choice:infirmerie.stay] -> promesse

=== promesse ===
Plus tard, le verger est plein de lampes. Ta montre est ouverte sur l'appui de la fenêtre. À la place du ressort, un petit fil de lumière tourne patiemment entre les rouages. # passage:promesse # segment:promesse.p1
Ton nom est apparu sur la porte de la chambre. En dessous, trois cases attendent sur l'emploi du temps. Tu passes le doigt dessus, déjà en train de penser à tout ce que tu veux apprendre. # segment:promesse.p2
+ [Commencer par la lumière et l'invention # choice:promesse.light]
    ~ calling = 1
    -> retour
+ [Apprendre à protéger les gens d'ici # choice:promesse.people]
    ~ calling = 2
    -> retour
+ [Comprendre les anciens passages # choice:promesse.memory]
    ~ calling = 3
    -> retour

=== fin ===
Avant de dormir, tu écris une phrase dans un carnet neuf : J'ai fait une lumière, et quelqu'un l'a vue. # passage:fin # segment:fin.p1
En dessous, tu recopies l'horaire du lendemain : neuf heures, au bord de la rivière, avec Sélian. Tu prépares ton stylet et une serviette sèche pour éviter de les chercher au réveil. Nour te demande si tu comptes dormir avec ton emploi du temps. Tu le ranges enfin dans le tiroir. # segment:fin.p2
Dehors, l'école retrouve ses bruits étranges et ordinaires. Nour te souhaite bonne nuit. La montre continue de battre. Tu laisses sa petite lumière allumée entre les deux lits. # segment:fin.p3
Chapitre I terminé — Ta place à Orée t'appartient. # segment:fin.p4
-> END

=== preuve ===
« Pardon, dis-tu, mais une école n'envoie pas quelqu'un arrêter les horloges. » Nour regarde la vitrine avec un véritable embarras. « Non. Ça, c'est toi. Je n'aurais pas su faire. » # passage:preuve # segment:preuve.p1
Nour pose une pièce sur le comptoir et trace un cercle autour avec son doigt. La pièce se redresse sur sa tranche, roule autour du cercle puis s'arrête devant toi. Tu passes la main au-dessus : aucun fil. Tu la prends entre deux doigts ; c'est du cuivre ordinaire, encore humide de pluie. # segment:preuve.p2
« Tu as fait la même chose avec les horloges, sans le vouloir. Il faut apprendre à le contrôler. » Tu regardes le tiroir où bat la montre démontée. Tu l'avais vérifiée trois fois hier. Nour te laisse t'asseoir avant de poursuivre : « Viens visiter l'école. Si tu préfères rentrer après, je te raccompagnerai. » # segment:preuve.p3
+ [Ouvrir l'enveloppe # choice:preuve.open] -> lettre

=== ville ===
Nour s'arrête devant l'ancienne gare des marchandises. Le bâtiment est condamné depuis douze ans ; tu passes devant chaque mercredi pour aller au marché. Ce soir, la fenêtre de la consigne est éclairée. Derrière, quelqu'un essuie des tasses. # passage:ville # segment:ville.p1
Nour frappe trois fois à la porte condamnée, puis montre son sceau de laiton. Les planches s'écartent, une à une, sans qu'aucun clou tombe. « Chaque école entretient un passage, explique-t-elle. Celui-ci ne s'ouvre qu'aux élèves et à leurs invités. » # segment:ville.p2
Sous la verrière, une rue entière s'est installée entre deux quais. Des parapluies sèchent ouverts à l'envers. Un boulanger retire d'un four de minuscules pains dont la croûte laisse échapper des constellations. Une femme en bleu gronde un escalier qui a encore déplacé sa dernière marche. # segment:ville.p3
Tu t'arrêtes devant une vitrine : une horloge tourne à l'envers, et pourtant les passants la consultent. Tu voudrais ouvrir son boîtier. Nour doit revenir sur ses pas pour te chercher ; tu as déjà six questions à lui poser. # segment:ville.p4
+ [Suivre l'odeur du pain # choice:ville.bread] -> boutique

=== boutique ===
Le boulanger t'offre un pain de route. « Première traversée ? Ça se voit aux yeux. » Sur une étagère, des boîtes portent des étiquettes : Orages brefs. Souvenirs de cuisine. Boutons qui retrouvent leur manteau. # passage:boutique # segment:boutique.p1
Tu cherches ton porte-monnaie. Nour te retient doucement. Les élèves reçoivent une chambre et de quoi vivre ; en échange, ils aident à entretenir les passages entre les deux mondes. « On apprend un métier, ici aussi. On n'achète pas le droit d'apprendre. » # segment:boutique.p2
« Et je peux revenir ? » demandes-tu. Son sourire devient moins léger. « Bien sûr. C'est une école, pas un enlèvement. Tu écriras demain. Le premier soir, on n'a généralement pas encore les mots. » # segment:boutique.p3
À l'autre bout du quai, une porte donne sur un chemin de campagne. Tu connais le mur derrière cette porte : il touche un entrepôt. Tu poses malgré tout le pied dans l'herbe. Elle mouille ta chaussure. # segment:boutique.p4
+ [Marcher vers la dernière lumière # choice:boutique.path] -> chemin

=== refectoire ===
Le dîner se tient sous un plafond de branches vivantes. La soupe arrive dans des bols dépareillés ; les cuillères, elles, se choisissent une main. La tienne attend poliment que tu aies fini de regarder partout. # passage:refectoire # segment:refectoire.p1
Personne n'a l'air surpris par ton arrivée. Un garçon te demande de lui passer le sel, puis s'excuse : il veut celui qui ne chante pas. À ta gauche, une vieille élève explique qu'elle a découvert son don à soixante ans, en recousant le même manteau pour la troisième fois. # segment:refectoire.p2
« On arrive quand on entend », dit-elle. Elle partage avec toi une poire dont le cœur est bleu. Elle a exactement le goût d'une poire. Tu es presque déçu, puis tu te mets à rire. # segment:refectoire.p3
Nour te raconte sa première semaine : les nuits sans dormir, l'envie d'essayer chaque porte, la peur qu'on la renvoie parce qu'elle ne réussissait rien du premier coup. Tu l'écoutes. Elle cesse peu à peu d'être la messagère d'un miracle ; elle devient quelqu'un avec qui tu aimerais prendre le petit déjeuner. # segment:refectoire.p4
+ [Trouver votre chambre # choice:refectoire.room] -> chambre

=== matin ===
Au réveil, tu cherches la tache du plafond de l'atelier. À sa place, la fenêtre découpe un ciel plein de graines argentées. L'armoire tousse. « Bonjour », dis-tu, sans savoir si c'est nécessaire. Elle s'ouvre. # passage:matin # segment:matin.p1
Sur ton bureau, une feuille explique trois règles : ne jamais forcer une volonté vivante ; défaire ce qu'on sait faire ; demander de l'aide avant d'avoir besoin d'être secouru. En dessous, quelqu'un a ajouté au crayon : Et ne pas nourrir les escaliers. # segment:matin.p2
Tu écris à l'atelier. Tu es en sécurité. On t'a proposé une formation. Tu reviendras dimanche expliquer le reste. La lettre se plie toute seule, mais attend que tu inscrives l'adresse : même ici, les petites choses ont leurs limites. # segment:matin.p3
Nour frappe avant d'entrer. « On commence cette première journée ? » Tu refermes ta montre. Pour une fois, tu n'as pas envie de vérifier l'heure. # segment:matin.p4
+ [Rejoindre le Jardin d'écoute # choice:matin.garden] -> relais

=== reparation ===
Les deux jours suivants ne ressemblent pas aux livres que tu lisais enfant. Tu recommences le même geste jusqu'à avoir mal au poignet. Tu allumes une bougie, puis dix fois rien du tout. Tu apprends qu'on peut être émerveillé et terriblement agacé au cours de la même minute. # passage:reparation # segment:reparation.p1
Sélian t'apprend surtout à défaire le fil d'air. « Soulever, c'est facile à vouloir. Reposer sans briser, voilà le travail. » Le deuxième soir, tu ramènes une tasse intacte jusqu'à la table. Nour applaudit sans ironie. # segment:reparation.p2
À l'atelier, tu cachais tes petites réussites étranges. Ici, quelqu'un les attend avec toi. C'est peut-être la différence la plus difficile à croire. # segment:reparation.p3
+ [Apprendre à tenir une note # choice:reparation.listen] -> cours_ecoute

=== archives ===
{game_success:Tu distingues un mot sous la marque effacée : ÉCOUTE. Tu montres à Abel la trace presque invisible. Il n'avait pas vu que le défaut gagnait déjà les lettres voisines.|Les lignes se confondent. Abel approche une lampe, puis te montre lui-même la marque : ce n'est pas un décor. C'est un mot dont on a retiré les lettres.} # passage:archives # segment:archives.p1
{game_success:
    ~ read_warning = true
}
Abel lit la note en marge : Ne pas refermer sur une voix vivante. « La voix guide les voyageurs. Sans ce verrou, l'arche peut retenir celle du dernier passant et tenter de fermer sur lui. » Il compare le dessin à son relevé du matin. Les fissures se sont allongées depuis hier. # segment:archives.p2
Il envoie un billet à Ysée par un petit tube de cuivre. « Il faut interdire aussi le passage de la serre. Je vais poser les barrières. » Avant de partir, il ouvre ton manuel à Trait d'aube : un sort qui desserre les enchantements. Il te montre le geste et te confie un vieux heurtoir pour t'exercer. # segment:archives.p3
+ [Commencer la leçon # choice:archives.lesson] -> formule

=== entrainement ===
Le troisième après-midi, Ysée vous conduit dans une cour bordée de tapis épais. Elle trace un cercle à la craie, retire son tablier et prend un bâton dont les deux bouts sont enveloppés de tissu. « Aujourd'hui, tu vas t'exercer avec moi. » # passage:entrainement # segment:entrainement.p1
Elle tend son bras. Un bouclier bleu pâle apparaît entre son coude et son poignet. « Essaie de toucher ma manche avec ton stylet. Tu peux frapper le bouclier pour l'affaiblir ou utiliser Trait d'aube pour le défaire. Moi, j'essaierai de te déséquilibrer. Les coups sont amortis ; on s'arrête dès que tu le demandes. » # segment:entrainement.p2
Elle te laisse éprouver le bouclier du bout des doigts : il cède comme un coussin, puis reprend sa forme. Nour s'installe au bord du cercle avec ton carnet. Tu vérifies que ton stylet est bien équipé avant de rejoindre Ysée. # segment:entrainement.p3
+ [Prendre le baume de soin et entrer dans le cercle # choice:entrainement.enter # game:take-balm] -> duel

=== duel ===
Ysée frappe le sol du bout de son bâton. Une brève vibration remonte par tes semelles ; le bouclier s'élargit devant elle. Elle prend sa garde sans te quitter des yeux. # passage:duel # segment:duel.p1
« Ne reste pas planté là à chercher le geste parfait. Un pas de côté, c'est déjà une réponse. » Elle attend que tu lèves ton stylet. Derrière elle, Nour te fait un signe d'encouragement. # segment:duel.p2
+ [Combattre Ysée pour l'exercice # choice:duel.fight # game:training-duel] -> apres_duel

=== apres_duel ===
{game_success:Le bouclier se disperse sous ton dernier coup. Le bout de ton stylet effleure la manche d'Ysée avant qu'elle puisse reculer. « Touchée. » Elle baisse son bâton et sourit.|Ysée baisse son bâton dès que tu quittes ta garde. Elle te laisse sortir du cercle et retrouver ton souffle. « On s'arrête ici. Tu pourras recommencer quand tu seras reposé. »} # passage:apres-duel # segment:apres-duel.p1
Elle te montre la trace de ses pieds dans la craie : elle s'est toujours déplacée du côté où ton bras était le plus lent. Tu refais le dernier mouvement avec elle, cette fois sans les coups. Nour note le conseil dans ton carnet : garder les genoux souples et regarder les épaules de l'adversaire. # segment:apres-duel.p2
+ [Se reposer avant la promenade # choice:apres-duel.rest # game:recover] -> veille

=== veille ===
Après les soins, Nour t'attend au bord du verger avec deux morceaux de pain. Les lampes s'allument une à une sous les branches. Tu t'aperçois que tu reconnais déjà celles qui penchent vers les voix. # passage:veille # segment:veille.p1
Nour s'arrête devant la serre et te montre les lampes vertes au-dessus de l'arche. L'une clignote. « On devrait attendre Abel. » Tu aperçois un ruban de chantier à terre ; le piquet qui le tenait s'est détaché du mur. # segment:veille.p2
Nour se penche pour ramasser le ruban quand la cloche du puits s'arrête au milieu d'une sonnerie. La lampe passe au rouge. Elle est encore dans l'encadrement ; tu lui attrapes la manche pour la tirer vers toi. # segment:veille.p3
+ [Retenir Nour sur le seuil # choice:veille.glass] -> serre

=== retour ===
Le lendemain, une réponse de monsieur Varenne t'attend sous la porte. Il a souligné deux fois : Dimanche, alors. Puis ajouté : Rapporte la montre, je veux voir ça. Tu écris l'heure du train sur ton emploi du temps et demandes à Nour où acheter deux billets. # passage:retour # segment:retour.p1
{calling == 1:Tu demandes à Sélian si un ressort peut être fait de lumière. Il tire une chaise.|{calling == 2:Tu demandes à Ysée comment rendre une voix à une porte sans en voler une autre. Elle ouvre son carnet.|Tu demandes à Abel qui a effacé le premier mot de l'arche. Il garde un moment le silence, puis te fait une place à son bureau.}} # segment:retour.p2
Il reste une demi-heure avant le cours. Tu ouvres le manuel à la page marquée par Abel et reproduis le premier schéma sur ton cahier. Cette fois, tu sais à quoi servent les six inscriptions. Tu soulignes celle qu'il faudra réparer. # segment:retour.p3
+ [Commencer ton premier vrai travail de sorcier # choice:retour.begin] -> fin
