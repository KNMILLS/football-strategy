extends Node

func test_matrix_coverage_and_context() -> void:
	var rules := get_tree().root.get_node("/root/Rules")
	assert(rules != null)
	var off_ids: Array = rules.get_offense_play_ids()
	var def_ids: Array = rules.get_defense_front_ids()
	assert(off_ids.size() == 12)
	assert(def_ids.size() == 6)
	for op in off_ids:
		for df in def_ids:
			var entry: Dictionary = rules.RULES["matrix"].get(op, {}).get(df, {})
			assert(entry.has("buckets"))
			var buckets: Array = entry.get("buckets", [])
			assert(buckets.size() > 0)
			# simple context filter shouldn't eliminate all
			var filtered: Array = rules._filter_buckets_by_context(entry)
			assert(filtered.size() > 0)


