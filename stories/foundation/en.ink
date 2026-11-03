VAR approach = ""
-> threshold

=== threshold ===
The key arrived in an envelope with no return address. # passage:threshold # segment:threshold.key
Beyond the gate, a single window was lit. You could call out, or listen first. # segment:threshold.window
* [Call into the house # choice:call]
  ~ approach = "call"
  -> landing
* [Listen at the door # choice:listen]
  ~ approach = "listen"
  -> landing

=== landing ===
{approach == "call": Your voice faded into the stairwell. Somewhere above you, a floorboard answered.|You held your breath. Behind the door, a clock ticked thirteen times.} # passage:landing # segment:landing.answer
The key turned easily. Whatever waited inside, it knew you had arrived. # segment:landing.key
-> END
