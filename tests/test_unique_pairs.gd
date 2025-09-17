extends Node

func test_team_loader_ordering_and_integrity() -> void:
	var tl := get_tree().root.get_node("/root/TeamLoader")
	var ids: Array = tl.call("get_team_ids")
	assert(ids.size() >= 2)
	# Ensure stable sort by display_name fallback; compare to a duplicate call
	var ids2: Array = tl.call("get_team_ids")
	assert(JSON.stringify(ids) == JSON.stringify(ids2))
	# Ensure each id maps to a display name string
	for tid in ids:
		var disp := String(tl.call("get_display_name", String(tid)))
		assert(disp.length() >= 1)


