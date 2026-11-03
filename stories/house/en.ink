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
The first time you saw the girl in the photograph, she was standing beside your grandmother. # passage:intro # segment:intro.p1
The second time, she was standing alone. # segment:intro.p2
You discovered the difference three weeks after the funeral. The picture had been hidden between the pages of an old cookbook. # segment:intro.p3
The photograph was dated June 14th, 1987. Your grandmother was twenty-six. The girl beside her looked exactly like you. # segment:intro.p4
{examined: The upstairs window in the photograph is open. # segment:intro.clue}
* {not examined} [Notice the upstairs window # choice:examine-photo # interaction]
  ~ examined = true
  -> intro
* [Continue reading # choice:intro.call]
  ~ metcaller = true
  -> call

=== call ===
On the back, your grandmother had written: If she comes looking for you, do not tell her your name. # passage:call # segment:call.p1
At that exact moment, the telephone rang. # segment:call.p2
“I am calling about the house,” a woman said. “Has anyone opened the upstairs room?” # segment:call.p3
Behind her voice, someone was humming a lullaby you remembered from childhood. # segment:call.p4
* [Ask about the locked room # choice:call.room]
  ~ caller += 5
  -> room
* [Ask about the singing # choice:call.song]
  ~ caller -= 5
  -> song

=== room ===
“Why the upstairs room?” # passage:room # segment:room.p1
The woman hesitated. “Because it was sealed twenty-nine years ago. And someone opened it last night.” # segment:room.p2
The call ended. # segment:room.p3
* [Continue reading # choice:room.arrival]
  -> arrival

=== song ===
“Who is singing?” # passage:song # segment:song.p1
The melody stopped. A second voice whispered into the receiver: “She can hear us.” # segment:song.p2
The call ended. # segment:song.p3
* [Continue reading # choice:song.arrival]
  -> arrival

=== arrival ===
Something slid beneath your apartment door. # passage:arrival # segment:arrival.p1
A cream-coloured envelope. No footsteps followed it. Across the front, in your grandmother’s handwriting: FOR THE ONE WHO STAYED. # segment:arrival.p2
The wax seal showed a small bird surrounded by seven stars. # segment:arrival.p3
* [Break the wax seal # choice:arrival.break]
  ~ brasskey = true
  -> break
* [Hold the envelope against the lamp # choice:arrival.light]
  ~ hiddenclue = true
  -> light

=== break ===
The wax cracked beneath your thumb. # passage:break # segment:break.p1
Inside, a letter: “There were two of you that summer. But only one came home.” # segment:break.p2
A tiny brass key was taped beneath the final line. # segment:break.p3
* [Continue reading # choice:break.last]
  -> last

=== light ===
You held the envelope close to the lamp. The paper slowly turned translucent. # passage:light # segment:light.p1
A hidden sentence emerged: “She is not your sister. She is what the house kept.” # segment:light.p2
You lowered the letter. The words were gone. # segment:light.p3
* [Continue reading # choice:light.last]
  -> last

=== last ===
The photograph lay on your desk. # passage:last # segment:last.p1
Three quiet knocks sounded at the window. You lived on the fifth floor. # segment:last.p2
The girl in the photograph was no longer looking at your grandmother. She was looking at you. # segment:last.p3
* [Look out of the window # choice:last.window]
  ~ girl -= 10
  -> window
* [Turn the photograph over # choice:last.photo]
  ~ girl += 10
  -> photo

=== window ===
Beyond the glass, the night was empty. # passage:window # segment:window.p1
Then a handprint appeared on the outside of the window. Five perfectly ordinary fingers. # segment:window.p2
Underneath, a word formed in the condensation: COME. # segment:window.p3
* [Continue reading # choice:window.end]
  -> end

=== photo ===
You turned the photograph over. # passage:photo # segment:photo.p1
The warning was gone. A new message had appeared in the same handwriting: “You remember me, don’t you?” # segment:photo.p2
The paper felt warm against your palm. # segment:photo.p3
* [Continue reading # choice:photo.end]
  -> end

=== end ===
By morning, you knew you would return to the house. # passage:end # segment:end.p1
Your grandmother had not been trying to keep you away from it. # segment:end.p2
She had been trying to keep something inside. # segment:end.p3
-> END

