extends Node

func _ready() -> void:
    var passed := 0
    var failed := 0
    var suites := [
        load("res://tests/test_timing_basics.gd").new(),
        load("res://tests/test_two_minute_ticks.gd").new(),
        load("res://tests/test_clock_determinism.gd").new(),
        load("res://tests/test_penalty_turnover_timing.gd").new()
    ]
    for s in suites:
        add_child(s)
        if s.has_method("_before_each"):
            s.call("_before_each")
        for m in s.get_method_list():
            var name := String(m.name)
            if name.begins_with("test_"):
                s.call(name)
                passed += 1
                print("PASS ", name)
        s.queue_free()
    print("Timing suite passed ", passed, " failed ", failed)
    get_tree().quit()


