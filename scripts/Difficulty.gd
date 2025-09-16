extends Node

enum Level { ROOKIE, PRO, LEGEND }

var level: int = Level.PRO

func set_level(new_level: int) -> void:
	level = clamp(new_level, 0, Level.LEGEND)

func get_level() -> int:
	return int(level)

func get_level_name() -> String:
	match level:
		Level.ROOKIE:
			return "ROOKIE"
		Level.PRO:
			return "PRO"
		Level.LEGEND:
			return "LEGEND"
	return "PRO"

func exploration_epsilon() -> float:
	match level:
		Level.ROOKIE:
			return 0.30
		Level.PRO:
			return 0.15
		Level.LEGEND:
			return 0.05
	return 0.15

func bluff_probability() -> float:
	match level:
		Level.ROOKIE:
			return 0.20
		Level.PRO:
			return 0.10
		Level.LEGEND:
			return 0.05
	return 0.10

func top_counter_bonus_weight() -> float:
	# Legend favors the top counter by +25% weight
	match level:
		Level.ROOKIE:
			return 0.0
		Level.PRO:
			return 0.0
		Level.LEGEND:
			return 0.25
	return 0.0


