VAR approach = ""
-> threshold

=== threshold ===
La clé était arrivée dans une enveloppe sans adresse de retour. # passage:threshold # segment:threshold.key
Au-delà du portail, une seule fenêtre était éclairée. Vous pouviez appeler, ou d’abord écouter. # segment:threshold.window
* [Appeler dans la maison # choice:call]
  ~ approach = "call"
  -> landing
* [Écouter à la porte # choice:listen]
  ~ approach = "listen"
  -> landing

=== landing ===
{approach == "call": Votre voix se perdit dans l’escalier. Quelque part au-dessus, une lame du parquet vous répondit.|Vous retîntes votre souffle. Derrière la porte, une horloge sonna treize coups.} # passage:landing # segment:landing.answer
La clé tourna sans effort. Ce qui vous attendait à l’intérieur savait que vous étiez là. # segment:landing.key
-> END
