extends Node

# Immutable per-session adjustments derived from base Rules + both teams + difficulty.

var offense_bias: Dictionary = {
	"INSIDE_POWER": 0.0, "OUTSIDE_ZONE": 0.0, "DRAW": 0.0, "QB_SNEAK": 0.0,
	"QUICK_SLANT": 0.0, "SCREEN": 0.0, "MEDIUM_CROSS": 0.0, "DEEP_POST": 0.0,
	"PA_SHORT": 0.0, "PA_DEEP": 0.0, "PUNT": 0.0, "FIELD_GOAL": 0.0
}
var defense_bias: Dictionary = {
	"RUN_BLITZ": 0.0, "BALANCED": 0.0, "PASS_SHELL": 0.0, "PRESS_MAN": 0.0,
	"ZONE_BLITZ": 0.0, "PREVENT": 0.0
}

# Token weight multipliers keyed by off_play and token predicate
# e.g., token_multipliers["PASS_SHORT"]["INCOMP"] = 0.96 to reduce incompletions by 4%
var token_multipliers: Dictionary = {}

# Field goal bucket tuning: {"0_39": 0.0, "40_49": 0.0, "50_57": 0.0}
var fg_bucket_delta: Dictionary = {"0_39": 0.0, "40_49": 0.0, "50_57": 0.0}

# Cached adjusted FG tables per bucket
var fg_adjusted_tables: Dictionary = {}

# Cached adjusted FG distributions (new Phase-4 special_teams format)
var fg_adjusted_dists: Dictionary = {}

func _sm() -> Object:
	return Engine.get_main_loop().root.get_node("/root/SeedManager")

func build(base_rules: Object, team1: Dictionary, team2: Dictionary, _difficulty_level: int) -> void:
	# Reset
	offense_bias = {
		"INSIDE_POWER": 0.0, "OUTSIDE_ZONE": 0.0, "DRAW": 0.0, "QB_SNEAK": 0.0,
		"QUICK_SLANT": 0.0, "SCREEN": 0.0, "MEDIUM_CROSS": 0.0, "DEEP_POST": 0.0,
		"PA_SHORT": 0.0, "PA_DEEP": 0.0, "PUNT": 0.0, "FIELD_GOAL": 0.0
	}
	defense_bias = {
		"RUN_BLITZ": 0.0, "BALANCED": 0.0, "PASS_SHELL": 0.0, "PRESS_MAN": 0.0,
		"ZONE_BLITZ": 0.0, "PREVENT": 0.0
	}
	token_multipliers.clear()
	fg_bucket_delta = {"0_39": 0.0, "40_49": 0.0, "50_57": 0.0}
	fg_adjusted_tables.clear()
	fg_adjusted_dists.clear()

	# Aggregate team biases (sum of both, tiny values). If teams are empty, this is a no-op.
	for side in ["offense", "defense"]:
		var cb1: Dictionary = (team1.get("call_bias", {}) as Dictionary)
		var cb2: Dictionary = (team2.get("call_bias", {}) as Dictionary)
		var src1: Dictionary = (cb1.get(side, {}) as Dictionary)
		var src2: Dictionary = (cb2.get(side, {}) as Dictionary)
		for k in src1.keys():
			if side == "offense":
				_apply_offense_bias_legacy(String(k), float(src1.get(k, 0.0)))
			else:
				_apply_defense_bias_legacy(String(k), float(src1.get(k, 0.0)))
		for k2 in src2.keys():
			if side == "offense":
				_apply_offense_bias_legacy(String(k2), float(src2.get(k2, 0.0)))
			else:
				_apply_defense_bias_legacy(String(k2), float(src2.get(k2, 0.0)))

	# Result tuning aggregation
	var rt1 := team1.get("result_tuning", {}) as Dictionary
	var rt2 := team2.get("result_tuning", {}) as Dictionary
	var rt_sum: Dictionary = {}
	for k in rt1.keys():
		rt_sum[k] = _merge_tuning(rt_sum.get(k, {}), rt1.get(k, {}))
	for k in rt2.keys():
		rt_sum[k] = _merge_tuning(rt_sum.get(k, {}), rt2.get(k, {}))

	# Map tuning keys (legacy names) to Phase-4 predicates and play IDs
	var ps := rt_sum.get("PASS_SHORT", {}) as Dictionary
	if ps.has("comp_rate"):
		var delta := float(ps["comp_rate"]) # e.g. +0.04
		for pshort in ["QUICK_SLANT", "SCREEN", "PA_SHORT", "MEDIUM_CROSS"]:
			_set_token_mult(pshort, "INCOMP", 1.0 - clamp(delta, -0.2, 0.2))
	var pl := rt_sum.get("PASS_LONG", {}) as Dictionary
	if pl.has("int_rate"):
		var idelta: float = 1.0 + clamp(float(pl["int_rate"]), -0.2, 0.2)
		for plong in ["DEEP_POST", "PA_DEEP"]:
			_set_token_mult(plong, "INT", idelta)
	var dsum := rt_sum.get("DEFENSE", {}) as Dictionary
	if dsum.has("sack_rate"):
		var sdelta: float = 1.0 + clamp(float(dsum["sack_rate"]), -0.2, 0.2)
		for ppass in ["QUICK_SLANT", "SCREEN", "MEDIUM_CROSS", "PA_SHORT", "DEEP_POST", "PA_DEEP"]:
			_set_token_mult(ppass, "SACK", sdelta)
	if dsum.has("penalty_def_plus5"):
		var pdelta: float = 1.0 + clamp(float(dsum["penalty_def_plus5"]), -0.2, 0.2)
		for p in ["INSIDE_POWER", "OUTSIDE_ZONE", "QUICK_SLANT", "MEDIUM_CROSS", "SCREEN", "DEEP_POST", "PA_SHORT", "PA_DEEP"]:
			_set_token_mult(p, "PENALTY_DEF_+5", pdelta)
	# FG buckets
	var fgb := rt_sum.get("FG_BUCKETS", {}) as Dictionary
	for buck in ["0_39", "40_49", "50_57"]:
		var dv := float(fgb.get(buck, 0.0))
		fg_bucket_delta[buck] = clamp(dv, -0.2, 0.2)
	# Precompute adjusted FG tables for legacy rules layout if present
	var legacy_data: Variant = base_rules.get("DATA")
	if typeof(legacy_data) == TYPE_DICTIONARY and (legacy_data as Dictionary).has("special"):
		var base_fg := (legacy_data as Dictionary)["special"]["FG"] as Dictionary
		for buck2 in base_fg.keys():
			fg_adjusted_tables[buck2] = _adjust_fg_table(base_fg[buck2], fg_bucket_delta.get(buck2, 0.0))
	# Phase-4 distributions
	var rules_dict: Variant = base_rules.get("RULES")
	if typeof(rules_dict) == TYPE_DICTIONARY:
		var fg_cfg := ((rules_dict as Dictionary).get("special_teams", {}) as Dictionary).get("field_goal", {}) as Dictionary
		for bk in fg_cfg.keys():
			fg_adjusted_dists[bk] = _adjust_fg_distribution(fg_cfg[bk], fg_bucket_delta.get(bk, 0.0))

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

# Phase-4: adjust_buckets for new JSON matrix entries (buckets of dicts)
func adjust_buckets(off_play: String, _def_front: String, base_buckets: Array) -> Array:
	var preds: Dictionary = token_multipliers.get(off_play, {}) as Dictionary
	if preds.is_empty():
		return base_buckets
	var rows: Array = []
	for b in base_buckets:
		var d := b as Dictionary
		var w := int(d.get("weight", 0))
		var w_scaled := float(max(0, w))
		for pred in preds.keys():
			if _bucket_matches_pred(d, String(pred)):
				w_scaled *= float(preds[pred])
		var d2 := d.duplicate(true)
		d2["weight"] = int(round(w_scaled))
		rows.append(d2)
	# Prevent zero total collapse: if all zero, return original
	var total := 0
	for r in rows:
		total += int((r as Dictionary).get("weight", 0))
	if total <= 0:
		return base_buckets
	return rows

func _bucket_matches_pred(b: Dictionary, pred: String) -> bool:
	var ev := String(b.get("event", ""))
	if pred == "INCOMP":
		return ev == "INCOMP"
	if pred == "INT":
		return ev == "INT"
	if pred == "SACK":
		return ev == "SACK"
	if pred.begins_with("PENALTY_DEF_+5"):
		if ev != "PENALTY_DEF":
			return false
		var p := b.get("penalty", {}) as Dictionary
		return String(p.get("kind", "+0")) == "+5"
	return false

# Phase-4: FG distribution adjustment helper
func adjust_fg_distribution(bucket_key: String, dist: Dictionary) -> Dictionary:
	return fg_adjusted_dists.get(bucket_key, dist)

func _adjust_fg_distribution(dist: Dictionary, good_delta: float) -> Dictionary:
	# Scale good by (1+delta), re-normalize miss to keep block fixed
	var good: float = float(dist.get("good", 0.0))
	var miss: float = float(dist.get("miss", 0.0))
	var block: float = float(dist.get("block", 0.0))
	var good2: float = clamp(good * (1.0 + good_delta), 0.0, 1.0)
	var remaining: float = max(0.0, 1.0 - block)
	var _sum_gm: float = max(0.0001, good + miss)
	var miss2: float = clamp(remaining - good2, 0.0, 1.0)
	if remaining > 0.0:
		# Keep good2 and miss2 proportions within remaining if needed
		var scale: float = remaining / max(0.0001, good2 + miss2)
		good2 *= scale
		miss2 *= scale
	return {"good": good2, "miss": miss2, "block": block}

# Big Play multipliers (tiny scheme nudges)
func bigplay_off_multiplier(off_play: String) -> float:
	var mult := 1.0
	# Offense scheme heuristics (both teams contribute small nudges)
	for scheme in _collect_offense_schemes():
		match String(scheme):
			"AIR_RAID":
				if off_play == "DEEP_POST" or off_play == "PA_DEEP":
					mult *= 1.10
			"POWER_GAP", "POWER_RUN":
				if off_play == "INSIDE_POWER":
					mult *= 1.05
			"WIDE_ZONE":
				if off_play == "PA_DEEP" or off_play == "PA_SHORT":
					mult *= 1.05
			"WEST_COAST":
				if off_play == "QUICK_SLANT" or off_play == "SCREEN":
					mult *= 1.05
	return clamp(mult, 0.7, 1.3)

func bigplay_def_multiplier(def_front: String) -> float:
	var mult := 1.0
	for scheme in _collect_defense_schemes():
		match String(scheme):
			"PRESS_MAN":
				if def_front == "PRESS_MAN":
					mult *= 1.05
			"MATCH_QUARTERS", "COVER2", "TAMPA2":
				if def_front == "PASS_SHELL":
					mult *= 1.03
	# Prevent has innate reduction on offense via matchup; keep def mult neutral
	return clamp(mult, 0.7, 1.3)

func _collect_offense_schemes() -> Array:
	# This is a light shim; in future pass actual offense/defense context
	return [
		String(_last_team1.get("offense_scheme", "")),
		String(_last_team2.get("offense_scheme", ""))
	]

func _collect_defense_schemes() -> Array:
	return [
		String(_last_team1.get("defense_scheme", "")),
		String(_last_team2.get("defense_scheme", ""))
	]

var _last_team1: Dictionary = {}
var _last_team2: Dictionary = {}

func _apply_offense_bias_legacy(old_key: String, val: float) -> void:
	match old_key:
		"RUN_IN":
			offense_bias["INSIDE_POWER"] = float(offense_bias.get("INSIDE_POWER", 0.0)) + val
		"RUN_OUT":
			offense_bias["OUTSIDE_ZONE"] = float(offense_bias.get("OUTSIDE_ZONE", 0.0)) + val
		"PASS_SHORT":
			for k in ["QUICK_SLANT", "SCREEN", "PA_SHORT", "MEDIUM_CROSS"]:
				offense_bias[k] = float(offense_bias.get(k, 0.0)) + val * 0.25
		"PASS_LONG":
			for k2 in ["DEEP_POST", "PA_DEEP"]:
				offense_bias[k2] = float(offense_bias.get(k2, 0.0)) + val * 0.5
		"PUNT":
			offense_bias["PUNT"] = float(offense_bias.get("PUNT", 0.0)) + val
		"FG":
			offense_bias["FIELD_GOAL"] = float(offense_bias.get("FIELD_GOAL", 0.0)) + val
		_:
			offense_bias[old_key] = float(offense_bias.get(old_key, 0.0)) + val

func _apply_defense_bias_legacy(old_key: String, val: float) -> void:
	match old_key:
		"ALL_OUT_RUSH":
			defense_bias["PRESS_MAN"] = float(defense_bias.get("PRESS_MAN", 0.0)) + val
		_:
			defense_bias[old_key] = float(defense_bias.get(old_key, 0.0)) + val

func record_teams(team1: Dictionary, team2: Dictionary) -> void:
	_last_team1 = team1.duplicate(true)
	_last_team2 = team2.duplicate(true)
