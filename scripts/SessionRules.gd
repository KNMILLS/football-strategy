extends Node

# Immutable per-session adjustments derived from base Rules + both teams + difficulty.

var offense_bias: Dictionary = {"RUN_IN": 0.0, "RUN_OUT": 0.0, "PASS_SHORT": 0.0, "PASS_LONG": 0.0, "PUNT": 0.0, "FG": 0.0}
var defense_bias: Dictionary = {"RUN_BLITZ": 0.0, "BALANCED": 0.0, "PASS_SHELL": 0.0, "ALL_OUT_RUSH": 0.0}

# Token weight multipliers keyed by off_play and token predicate
# e.g., token_multipliers["PASS_SHORT"]["INCOMP"] = 0.96 to reduce incompletions by 4%
var token_multipliers: Dictionary = {}

# Field goal bucket tuning: {"0_39": 0.0, "40_49": 0.0, "50_57": 0.0}
var fg_bucket_delta: Dictionary = {"0_39": 0.0, "40_49": 0.0, "50_57": 0.0}

# Cached adjusted FG tables per bucket
var fg_adjusted_tables: Dictionary = {}

func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

func build(base_rules: Object, team1: Dictionary, team2: Dictionary, _difficulty_level: int) -> void:
	# Reset
	offense_bias = {"RUN_IN": 0.0, "RUN_OUT": 0.0, "PASS_SHORT": 0.0, "PASS_LONG": 0.0, "PUNT": 0.0, "FG": 0.0}
	defense_bias = {"RUN_BLITZ": 0.0, "BALANCED": 0.0, "PASS_SHELL": 0.0, "ALL_OUT_RUSH": 0.0}
	token_multipliers.clear()
	fg_bucket_delta = {"0_39": 0.0, "40_49": 0.0, "50_57": 0.0}
	fg_adjusted_tables.clear()

	# Aggregate team biases (sum of both, tiny values)
	for side in ["offense", "defense"]:
		var cb1: Dictionary = team1.get("call_bias", {}) as Dictionary
		var cb2: Dictionary = team2.get("call_bias", {}) as Dictionary
		var src1: Dictionary = cb1.get(side, {}) as Dictionary
		var src2: Dictionary = cb2.get(side, {}) as Dictionary
		for k in src1.keys():
			if side == "offense":
				offense_bias[k] = float(offense_bias.get(k, 0.0)) + float(src1.get(k, 0.0))
			else:
				defense_bias[k] = float(defense_bias.get(k, 0.0)) + float(src1.get(k, 0.0))
		for k2 in src2.keys():
			if side == "offense":
				offense_bias[k2] = float(offense_bias.get(k2, 0.0)) + float(src2.get(k2, 0.0))
			else:
				defense_bias[k2] = float(defense_bias.get(k2, 0.0)) + float(src2.get(k2, 0.0))

	# Result tuning aggregation
	var rt1 := team1.get("result_tuning", {}) as Dictionary
	var rt2 := team2.get("result_tuning", {}) as Dictionary
	var rt_sum: Dictionary = {}
	for k in rt1.keys():
		rt_sum[k] = _merge_tuning(rt_sum.get(k, {}), rt1.get(k, {}))
	for k in rt2.keys():
		rt_sum[k] = _merge_tuning(rt_sum.get(k, {}), rt2.get(k, {}))

	# Map tuning keys to token multipliers
	# PASS_SHORT.comp_rate -> reduce INCOMP, distribute to YARDS
	var ps := rt_sum.get("PASS_SHORT", {}) as Dictionary
	if ps.has("comp_rate"):
		var delta := float(ps["comp_rate"]) # e.g. +0.04
		_set_token_mult("PASS_SHORT", "INCOMP", 1.0 - clamp(delta, -0.2, 0.2))
	# PASS_LONG.int_rate -> scale INT tokens
	var pl := rt_sum.get("PASS_LONG", {}) as Dictionary
	if pl.has("int_rate"):
		var idelta: float = 1.0 + clamp(float(pl["int_rate"]), -0.2, 0.2)
		_set_token_mult("PASS_LONG", "INT", idelta)
	# DEFENSE.sack_rate -> scale SACK tokens in both pass plays
	var dsum := rt_sum.get("DEFENSE", {}) as Dictionary
	if dsum.has("sack_rate"):
		var sdelta: float = 1.0 + clamp(float(dsum["sack_rate"]), -0.2, 0.2)
		_set_token_mult("PASS_SHORT", "SACK", sdelta)
		_set_token_mult("PASS_LONG", "SACK", sdelta)
	# DEFENSE.penalty_def_plus5 -> scale PENALTY_DEF_+5 tokens
	if dsum.has("penalty_def_plus5"):
		var pdelta: float = 1.0 + clamp(float(dsum["penalty_def_plus5"]), -0.2, 0.2)
		_set_token_mult("RUN_IN", "PENALTY_DEF_+5", pdelta)
		_set_token_mult("RUN_OUT", "PENALTY_DEF_+5", pdelta)
		_set_token_mult("PASS_SHORT", "PENALTY_DEF_+5", pdelta)
		_set_token_mult("PASS_LONG", "PENALTY_DEF_+5", pdelta)
	# FG buckets
	var fgb := rt_sum.get("FG_BUCKETS", {}) as Dictionary
	for buck in ["0_39", "40_49", "50_57"]:
		var dv := float(fgb.get(buck, 0.0))
		fg_bucket_delta[buck] = clamp(dv, -0.2, 0.2)
	# Precompute adjusted FG tables now
	var base_fg := base_rules.DATA["special"]["FG"] as Dictionary
	for buck2 in base_fg.keys():
		fg_adjusted_tables[buck2] = _adjust_fg_table(base_fg[buck2], fg_bucket_delta.get(buck2, 0.0))

func _merge_tuning(a: Variant, b: Variant) -> Dictionary:
	var da := (a if typeof(a) == TYPE_DICTIONARY else {}) as Dictionary
	var db := (b if typeof(b) == TYPE_DICTIONARY else {}) as Dictionary
	var out: Dictionary = {}
	for k in da.keys():
		out[k] = da[k]
	for k2 in db.keys():
		out[k2] = float(db[k2]) + float(out.get(k2, 0.0))
	return out

func _set_token_mult(off_play: String, predicate: String, multiplier: float) -> void:
	if not token_multipliers.has(off_play):
		token_multipliers[off_play] = {}
	token_multipliers[off_play][predicate] = float(multiplier)

func adjusted_matrix_table(base_table: Array, off_play: String) -> Array:
	# Returns a new table with token weights adjusted according to token_multipliers
	var preds: Dictionary = token_multipliers.get(off_play, {}) as Dictionary
	if preds.is_empty():
		return base_table
	# Copy
	var rows: Array = []
	for item in base_table:
		rows.append([item[0], int(item[1])])
	# Apply predicate-based scalars
	for i in rows.size():
		var token := String(rows[i][0])
		var weight := float(rows[i][1])
		for pred in preds.keys():
			if _token_matches_pred(token, pred):
				weight *= float(preds[pred])
		rows[i][1] = int(round(weight))
	# Normalize to preserve total weight (avoid zero collapse)
	var total := 0
	for r in rows:
		total += int(r[1])
	if total <= 0:
		return base_table
	return rows

func _token_matches_pred(token: String, pred: String) -> bool:
	if pred == "INCOMP":
		return token == "INCOMP"
	if pred == "INT":
		return token == "INT"
	if pred == "SACK":
		return token.begins_with("SACK_")
	if pred.begins_with("PENALTY_DEF_+5"):
		return token == "PENALTY_DEF_+5"
	return false

func get_offense_bias() -> Dictionary:
	return offense_bias.duplicate()

func get_defense_bias() -> Dictionary:
	return defense_bias.duplicate()

func adjusted_fg_bucket_table(bucket_key: String, base_table: Array) -> Array:
	return fg_adjusted_tables.get(bucket_key, base_table)

func _adjust_fg_table(base_table: Array, good_delta: float) -> Array:
	# good_delta in [-0.2, +0.2] shifts GOOD vs MISS by scaling GOOD weight
	var rows: Array = []
	for item in base_table:
		rows.append([item[0], int(item[1])])
	for i in rows.size():
		if String(rows[i][0]) == "GOOD":
			rows[i][1] = int(round(float(rows[i][1]) * (1.0 + good_delta)))
	# Rebalance to avoid zero total
	var total := 0
	for r in rows:
		total += int(r[1])
	if total <= 0:
		return base_table
	return rows


