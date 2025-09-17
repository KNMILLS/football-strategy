extends Node

class_name EventLogger

static func _emoji(outcome: Dictionary) -> String:
	var ev := String(outcome.get("event_name", ""))
	var is_big := bool(outcome.get("big_play", false))
	var is_def_td := bool(outcome.get("defense_td", false))
	if is_big:
		return "🛡️" if is_def_td else "🔥"
	match ev:
		"SACK":
			return "💥"
		"INT":
			return "🛑"
		"FUMBLE":
			return "⚠️"
		_:
			pass
	if ev.begins_with("PENALTY"):
		return "🚩"
	if ev == "PUNT" or ev == "BLOCK" or ev == "GOOD" or ev == "MISS" or ev == "OUT_OF_RANGE" or ev == "KICKOFF" or ev == "ONSIDE" or ev == "DEFENSE_TWO":
		return "🏈"
	return "📈"

static func banner(off_play: String, def_play: String, outcome: Dictionary) -> String:
	var header := "%s vs %s" % [off_play, def_play]
	var body := String(outcome.get("descriptive_text", String(outcome.get("event_name", ""))))
	return "%s %s → %s" % [_emoji(outcome), header, body]

static func log_line(off_play: String, def_play: String, outcome: Dictionary) -> String:
	# Same as banner for now; could be richer later.
	return banner(off_play, def_play, outcome)

static func coin_toss_text(visitor_called_heads: bool, winner_index: int) -> String:
	# winner_index: 0 Home, 1 Away
	var call_text := "Heads" if visitor_called_heads else "Tails"
	var who := "Away" if int(winner_index) == 1 else "Home"
	return "🪙 Coin Toss: Visitor calls %s — %s wins" % [call_text, who]


