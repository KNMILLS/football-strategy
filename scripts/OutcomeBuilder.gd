extends Node

class_name OutcomeBuilder

# Ensures outcomes have a consistent shape for timing/logging/determinism.
# Required fields:
# - event_name: String
# - yards_delta: int
# - turnover: bool
# - touchdown: bool
# - penalty_replay: bool
# - timing_tag: String
# - ended_inbounds: bool
# - big_play: bool

static func make(base: Dictionary) -> Dictionary:
	var out: Dictionary = {}
	# Defaults
	out["event_name"] = String(base.get("event_name", ""))
	out["yards_delta"] = int(base.get("yards_delta", 0))
	out["turnover"] = bool(base.get("turnover", false))
	out["touchdown"] = bool(base.get("touchdown", false))
	out["penalty_replay"] = bool(base.get("penalty_replay", false))
	out["timing_tag"] = String(base.get("timing_tag", ""))
	out["ended_inbounds"] = bool(base.get("ended_inbounds", true))
	out["big_play"] = bool(base.get("big_play", false))
	# Preserve any additional fields
	for k in base.keys():
		out[k] = base[k]
	return out


