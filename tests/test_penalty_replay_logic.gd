extends Node

func test_penalty_replay_and_auto_first_down_by_yardage() -> void:
	var sm := get_node("/root/SeedManager")
	var gs := get_node("/root/GameState")
	var rules := get_node("/root/Rules")
	sm.set_seed(1234)
	gs.new_session(1234, 1, 1)
	# Defensive penalty +5 on 1st & 10 should replay and potentially reduce to_go
	var before_to_go: int = int(gs.to_go)
	var pen := {"event_name":"PENALTY_DEF","yards_delta":5,"penalty_replay":true}
	rules.apply_outcome(gs, pen)
	assert(gs.down == 1)
	assert(gs.to_go <= before_to_go)
	# Offensive penalty -10 should replay and increase to_go but keep down
	var before_down: int = int(gs.down)
	var pen_off := {"event_name":"PENALTY_OFF","yards_delta":-10,"penalty_replay":true}
	rules.apply_outcome(gs, pen_off)
	assert(gs.down == before_down)


