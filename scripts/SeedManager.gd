extends Node

var rng: RandomNumberGenerator
var current_seed: int = 0
var rng_call_count: int = 0

func _ready() -> void:
	rng = RandomNumberGenerator.new()
	set_seed(Time.get_ticks_msec())

func set_seed(seed_value: int) -> void:
	current_seed = seed_value
	rng.seed = seed_value
	rng.state = 0
	rng_call_count = 0

func reseed_with_time() -> void:
	set_seed(Time.get_ticks_msec())

func randf() -> float:
	rng_call_count += 1
	return rng.randf()

func randi() -> int:
	rng_call_count += 1
	return rng.randi()

func randi_range(a: int, b: int) -> int:
	rng_call_count += 1
	return rng.randi_range(a, b)

func chance(probability_0_to_1: float) -> bool:
	if probability_0_to_1 <= 0.0:
		return false
	if probability_0_to_1 >= 1.0:
		return true
	rng_call_count += 1
	return rng.randf() < probability_0_to_1

func weighted_choice(options: Array) -> Variant:
	# options: Array[[value, weight], ...] where weight is int
	var total_weight := 0
	for item in options:
		total_weight += int(item[1])
	if total_weight <= 0:
		return null
	var pick := randi_range(1, total_weight)
	var cumulative := 0
	for item in options:
		cumulative += int(item[1])
		if pick <= cumulative:
			return item[0]
	return options.back()[0]
