VAR metgrandmother = true
VAR metgirl = true
VAR metcaller = false
VAR brasskey = false
VAR caller = 0
VAR girl = -20
VAR examined = false
VAR hiddenclue = false
-> intro

=== intro ===
La première fois que vous avez vu la jeune fille sur la photographie, elle se tenait à côté de votre grand-mère. # passage:intro # segment:intro.p1
La deuxième fois, elle était seule. # segment:intro.p2
Vous avez remarqué la différence trois semaines après les funérailles. La photo était cachée entre les pages d’un vieux livre de recettes. # segment:intro.p3
La photographie était datée du 14 juin 1987. Votre grand-mère avait vingt-six ans. La jeune fille à ses côtés vous ressemblait trait pour trait. # segment:intro.p4
{examined: La fenêtre à l’étage est ouverte sur la photographie. # segment:intro.clue}
* {not examined} [Remarquer la fenêtre à l’étage # choice:examine-photo # interaction]
  ~ examined = true
  -> intro
* [Continuer la lecture # choice:intro.call]
  ~ metcaller = true
  -> call

=== call ===
Au dos, votre grand-mère avait écrit : Si elle vient te chercher, ne lui dis pas ton nom. # passage:call # segment:call.p1
À cet instant précis, le téléphone a sonné. # segment:call.p2
« J’appelle au sujet de la maison, a dit une femme. Quelqu’un a-t-il ouvert la pièce à l’étage ? » # segment:call.p3
Derrière sa voix, quelqu’un fredonnait une berceuse dont vous vous souveniez depuis l’enfance. # segment:call.p4
* [Poser une question sur la pièce condamnée # choice:call.room]
  ~ caller += 5
  -> room
* [Poser une question sur le chant # choice:call.song]
  ~ caller -= 5
  -> song

=== room ===
« Pourquoi la pièce à l’étage ? » # passage:room # segment:room.p1
La femme a hésité. « Parce qu’elle a été condamnée il y a vingt-neuf ans. Et que quelqu’un l’a ouverte la nuit dernière. » # segment:room.p2
La communication a été coupée. # segment:room.p3
* [Continuer la lecture # choice:room.arrival]
  -> arrival

=== song ===
« Qui chante ? » # passage:song # segment:song.p1
La mélodie s’est tue. Une deuxième voix a murmuré dans le combiné : « Elle peut nous entendre. » # segment:song.p2
La communication a été coupée. # segment:song.p3
* [Continuer la lecture # choice:song.arrival]
  -> arrival

=== arrival ===
Quelque chose a glissé sous la porte de votre appartement. # passage:arrival # segment:arrival.p1
Une enveloppe couleur crème. Aucun bruit de pas ne l’a suivie. Sur le devant, de l’écriture de votre grand-mère : POUR CELLE QUI EST RESTÉE. # segment:arrival.p2
Le sceau de cire représentait un petit oiseau entouré de sept étoiles. # segment:arrival.p3
* [Briser le sceau de cire # choice:arrival.break]
  ~ brasskey = true
  -> break
* [Tenir l’enveloppe devant la lampe # choice:arrival.light]
  ~ hiddenclue = true
  -> light

=== break ===
La cire a craqué sous votre pouce. # passage:break # segment:break.p1
À l’intérieur, une lettre : « Vous étiez deux cet été-là. Mais une seule est rentrée à la maison. » # segment:break.p2
Une minuscule clé en laiton était fixée sous la dernière ligne. # segment:break.p3
* [Continuer la lecture # choice:break.last]
  -> last

=== light ===
Vous avez approché l’enveloppe de la lampe. Le papier est lentement devenu translucide. # passage:light # segment:light.p1
Une phrase cachée est apparue : « Elle n’est pas ta sœur. Elle est ce que la maison a gardé. » # segment:light.p2
Vous avez baissé la lettre. Les mots avaient disparu. # segment:light.p3
* [Continuer la lecture # choice:light.last]
  -> last

=== last ===
La photographie était posée sur votre bureau. # passage:last # segment:last.p1
Trois coups discrets ont retenti à la fenêtre. Vous habitiez au cinquième étage. # segment:last.p2
La jeune fille sur la photographie ne regardait plus votre grand-mère. Elle vous regardait. # segment:last.p3
* [Regarder par la fenêtre # choice:last.window]
  ~ girl -= 10
  -> window
* [Retourner la photographie # choice:last.photo]
  ~ girl += 10
  -> photo

=== window ===
Derrière la vitre, la nuit était vide. # passage:window # segment:window.p1
Puis une empreinte de main est apparue à l’extérieur de la fenêtre. Cinq doigts parfaitement ordinaires. # segment:window.p2
En dessous, un mot s’est formé dans la buée : VIENS. # segment:window.p3
* [Continuer la lecture # choice:window.end]
  -> end

=== photo ===
Vous avez retourné la photographie. # passage:photo # segment:photo.p1
L’avertissement avait disparu. Un nouveau message était apparu, de la même écriture : « Tu te souviens de moi, n’est-ce pas ? » # segment:photo.p2
Le papier était chaud contre votre paume. # segment:photo.p3
* [Continuer la lecture # choice:photo.end]
  -> end

=== end ===
Au matin, vous saviez que vous retourneriez à la maison. # passage:end # segment:end.p1
Votre grand-mère n’avait pas essayé de vous en tenir à l’écart. # segment:end.p2
Elle avait essayé de garder quelque chose à l’intérieur. # segment:end.p3
-> END

