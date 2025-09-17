extends Resource

class_name Teams

# 32 NFL teams minimal dataset for Team Selection UI.
# Logos are referenced under res://assets/logos/<abbr>.png; UI will fallback if missing.

const _TEAMS: Array = [
	{ "id":"ARI", "city":"Arizona", "name":"Cardinals", "abbr":"ARI", "logo_path":"res://assets/logos/ARI.png", "offense":"Multiple", "defense":"4-3", "strengths":["Tempo","Spread"], "weaknesses":["Trenches"] },
	{ "id":"ATL", "city":"Atlanta", "name":"Falcons", "abbr":"ATL", "logo_path":"res://assets/logos/ATL.png", "offense":"Outside Zone", "defense":"4-3", "strengths":["Run game"], "weaknesses":["Deep shots"] },
	{ "id":"BAL", "city":"Baltimore", "name":"Ravens", "abbr":"BAL", "logo_path":"res://assets/logos/BAL.png", "offense":"Power/Option", "defense":"Multiple", "strengths":["QB run","Defense"], "weaknesses":["Boundary shots"] },
	{ "id":"BUF", "city":"Buffalo", "name":"Bills", "abbr":"BUF", "logo_path":"res://assets/logos/BUF.png", "offense":"Air/Spread", "defense":"Multiple", "strengths":["Explosive pass"], "weaknesses":["Short yardage"] },
	{ "id":"CAR", "city":"Carolina", "name":"Panthers", "abbr":"CAR", "logo_path":"res://assets/logos/CAR.png", "offense":"Multiple", "defense":"4-3", "strengths":["Balance"], "weaknesses":["Explosiveness"] },
	{ "id":"CHI", "city":"Chicago", "name":"Bears", "abbr":"CHI", "logo_path":"res://assets/logos/CHI.png", "offense":"Power/Boot", "defense":"4-3", "strengths":["Run power"], "weaknesses":["Vertical pass"] },
	{ "id":"CIN", "city":"Cincinnati", "name":"Bengals", "abbr":"CIN", "logo_path":"res://assets/logos/CIN.png", "offense":"Spread/Timing", "defense":"Multiple", "strengths":["WR talent"], "weaknesses":["Short yardage"] },
	{ "id":"CLE", "city":"Cleveland", "name":"Browns", "abbr":"CLE", "logo_path":"res://assets/logos/CLE.png", "offense":"Outside Zone", "defense":"4-3", "strengths":["Run game"], "weaknesses":["Explosive pass"] },
	{ "id":"DAL", "city":"Dallas", "name":"Cowboys", "abbr":"DAL", "logo_path":"res://assets/logos/DAL.png", "offense":"WCO/Vertical", "defense":"Multiple", "strengths":["Explosive plays"], "weaknesses":["Turnovers"] },
	{ "id":"DEN", "city":"Denver", "name":"Broncos", "abbr":"DEN", "logo_path":"res://assets/logos/DEN.png", "offense":"Outside Zone", "defense":"3-4", "strengths":["Boot action"], "weaknesses":["Run fits"] },
	{ "id":"DET", "city":"Detroit", "name":"Lions", "abbr":"DET", "logo_path":"res://assets/logos/DET.png", "offense":"Power/Play-Action", "defense":"Multiple", "strengths":["OL","PA"], "weaknesses":["Speed"] },
	{ "id":"GB", "city":"Green Bay", "name":"Packers", "abbr":"GB", "logo_path":"res://assets/logos/GB.png", "offense":"WCO/Boot", "defense":"Multiple", "strengths":["Efficiency"], "weaknesses":["Explosive run"] },
	{ "id":"HOU", "city":"Houston", "name":"Texans", "abbr":"HOU", "logo_path":"res://assets/logos/HOU.png", "offense":"Air/Spread", "defense":"4-3", "strengths":["Passing"], "weaknesses":["Short yardage"] },
	{ "id":"IND", "city":"Indianapolis", "name":"Colts", "abbr":"IND", "logo_path":"res://assets/logos/IND.png", "offense":"Power/Boot", "defense":"4-3", "strengths":["QB run"], "weaknesses":["Deep coverage"] },
	{ "id":"JAX", "city":"Jacksonville", "name":"Jaguars", "abbr":"JAX", "logo_path":"res://assets/logos/JAX.png", "offense":"Spread", "defense":"Multiple", "strengths":["Tempo"], "weaknesses":["Trenches"] },
	{ "id":"KC", "city":"Kansas City", "name":"Chiefs", "abbr":"KC", "logo_path":"res://assets/logos/KC.png", "offense":"Spread/WCO", "defense":"Multiple", "strengths":["Explosive pass"], "weaknesses":["Short yardage"] },
	{ "id":"LV", "city":"Las Vegas", "name":"Raiders", "abbr":"LV", "logo_path":"res://assets/logos/LV.png", "offense":"Power/Vertical", "defense":"4-3", "strengths":["Deep shots"], "weaknesses":["Efficiency"] },
	{ "id":"LAC", "city":"Los Angeles", "name":"Chargers", "abbr":"LAC", "logo_path":"res://assets/logos/LAC.png", "offense":"Air/Spread", "defense":"Multiple", "strengths":["Passing"], "weaknesses":["Run defense"] },
	{ "id":"LAR", "city":"Los Angeles", "name":"Rams", "abbr":"LAR", "logo_path":"res://assets/logos/LAR.png", "offense":"Outside Zone/PA", "defense":"Multiple", "strengths":["PA","WR"], "weaknesses":["Run power"] },
	{ "id":"MIA", "city":"Miami", "name":"Dolphins", "abbr":"MIA", "logo_path":"res://assets/logos/MIA.png", "offense":"Speed/Spread", "defense":"Multiple", "strengths":["Speed"], "weaknesses":["Physicality"] },
	{ "id":"MIN", "city":"Minnesota", "name":"Vikings", "abbr":"MIN", "logo_path":"res://assets/logos/MIN.png", "offense":"WCO/PA", "defense":"Multiple", "strengths":["WR"], "weaknesses":["Run fits"] },
	{ "id":"NE", "city":"New England", "name":"Patriots", "abbr":"NE", "logo_path":"res://assets/logos/NE.png", "offense":"Multiple", "defense":"Multiple", "strengths":["Situational"], "weaknesses":["Explosiveness"] },
	{ "id":"NO", "city":"New Orleans", "name":"Saints", "abbr":"NO", "logo_path":"res://assets/logos/NO.png", "offense":"Aggressive WCO", "defense":"Multiple", "strengths":["Passing"], "weaknesses":["Run game"] },
	{ "id":"NYG", "city":"New York", "name":"Giants", "abbr":"NYG", "logo_path":"res://assets/logos/NYG.png", "offense":"Multiple", "defense":"Multiple", "strengths":["Balance"], "weaknesses":["Explosive pass"] },
	{ "id":"NYJ", "city":"New York", "name":"Jets", "abbr":"NYJ", "logo_path":"res://assets/logos/NYJ.png", "offense":"Multiple", "defense":"4-3", "strengths":["Defense"], "weaknesses":["Explosive plays"] },
	{ "id":"PHI", "city":"Philadelphia", "name":"Eagles", "abbr":"PHI", "logo_path":"res://assets/logos/PHI.png", "offense":"RPO/Spread", "defense":"Multiple", "strengths":["QB sneak","RPO"], "weaknesses":["DB depth"] },
	{ "id":"PIT", "city":"Pittsburgh", "name":"Steelers", "abbr":"PIT", "logo_path":"res://assets/logos/PIT.png", "offense":"Power/PA", "defense":"3-4", "strengths":["Defense"], "weaknesses":["Explosive pass"] },
	{ "id":"SF", "city":"San Francisco", "name":"49ers", "abbr":"SF", "logo_path":"res://assets/logos/SF.png", "offense":"Outside Zone/PA", "defense":"Multiple", "strengths":["YAC","PA"], "weaknesses":["Deep speed"] },
	{ "id":"SEA", "city":"Seattle", "name":"Seahawks", "abbr":"SEA", "logo_path":"res://assets/logos/SEA.png", "offense":"Multiple", "defense":"Multiple", "strengths":["WR shots"], "weaknesses":["Run fits"] },
	{ "id":"TB", "city":"Tampa Bay", "name":"Buccaneers", "abbr":"TB", "logo_path":"res://assets/logos/TB.png", "offense":"WCO/Vertical", "defense":"Multiple", "strengths":["WR"], "weaknesses":["Run game"] },
	{ "id":"TEN", "city":"Tennessee", "name":"Titans", "abbr":"TEN", "logo_path":"res://assets/logos/TEN.png", "offense":"Power/PA", "defense":"4-3", "strengths":["Run power"], "weaknesses":["Explosive pass"] },
	{ "id":"WAS", "city":"Washington", "name":"Commanders", "abbr":"WAS", "logo_path":"res://assets/logos/WAS.png", "offense":"Multiple", "defense":"Multiple", "strengths":["Balance"], "weaknesses":["Explosive plays"] }
]

static func get_all() -> Array:
	# Return a duplicate to avoid mutation by callers
	return _TEAMS.duplicate(true)

static func get_by_id(id: StringName) -> Dictionary:
	var sid: String = String(id)
	for t in _TEAMS:
		if String(t.get("id", "")) == sid:
			return (t as Dictionary).duplicate(true)
	return {}


