extends Node

var play_mode: String = "Exhibition"
var home_abbr: String = ""
var visitor_abbr: String = ""
var game_length_minutes: int = 10
var weather: String = "Fair"
var p1_id: String = ""
var opp_id: String = ""

func apply_from_team_selection(cfg: Dictionary) -> void:
	play_mode = String(cfg.get("play_mode", play_mode))
	home_abbr = String(cfg.get("home_abbr", home_abbr))
	visitor_abbr = String(cfg.get("visitor_abbr", visitor_abbr))
	game_length_minutes = int(cfg.get("game_length_minutes", game_length_minutes))
	weather = String(cfg.get("weather", weather))
	p1_id = String(cfg.get("p1_id", p1_id))
	opp_id = String(cfg.get("opp_id", opp_id))
	_save()

func _save() -> void:
	var cf := ConfigFile.new()
	cf.set_value("MatchConfig", "play_mode", play_mode)
	cf.set_value("MatchConfig", "home_abbr", home_abbr)
	cf.set_value("MatchConfig", "visitor_abbr", visitor_abbr)
	cf.set_value("MatchConfig", "game_length_minutes", game_length_minutes)
	cf.set_value("MatchConfig", "weather", weather)
	cf.set_value("MatchConfig", "p1_id", p1_id)
	cf.set_value("MatchConfig", "opp_id", opp_id)
	cf.save("user://match_config.cfg")

func load_latest() -> void:
	var cf := ConfigFile.new()
	if cf.load("user://match_config.cfg") == OK:
		play_mode = String(cf.get_value("MatchConfig", "play_mode", play_mode))
		home_abbr = String(cf.get_value("MatchConfig", "home_abbr", home_abbr))
		visitor_abbr = String(cf.get_value("MatchConfig", "visitor_abbr", visitor_abbr))
		game_length_minutes = int(cf.get_value("MatchConfig", "game_length_minutes", game_length_minutes))
		weather = String(cf.get_value("MatchConfig", "weather", weather))
		p1_id = String(cf.get_value("MatchConfig", "p1_id", p1_id))
		opp_id = String(cf.get_value("MatchConfig", "opp_id", opp_id))


