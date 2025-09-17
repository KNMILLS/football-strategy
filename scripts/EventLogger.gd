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
	if ev == "PUNT" or ev == "BLOCK" or ev == "GOOD" or ev == "MISS" or ev == "OUT_OF_RANGE":
		return "🏈"
	return "📈"

static func banner(off_play: String, def_play: String, outcome: Dictionary) -> String:
	var header := "%s vs %s" % [off_play, def_play]
	var body := String(outcome.get("descriptive_text", String(outcome.get("event_name", ""))))
	return "%s %s → %s" % [_emoji(outcome), header, body]

static func log_line(off_play: String, def_play: String, outcome: Dictionary) -> String:
	# Same as banner for now; could be richer later.
	return banner(off_play, def_play, outcome)


