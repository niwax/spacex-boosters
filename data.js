'strict'

var boosters = [];
var stats = {};
var baseDate = new Date();

function load(callback) {
    const options = {
        method: 'POST',
        body: JSON.stringify({
            "query": {},
            "options": {
                "pagination": false,
                "populate": [
                    "payloads",
                    "core",
                    "launchpad",
                    "rocket",
                    "ships",
                    "cores.core"
                ]
            },
        }),
        headers: {
            'Content-Type': 'application/json'
        }
    }

    fetch("https://api.spacexdata.com/v4/launches/query", options)
        .then(res => res.json())
        .then(res => createBoosterList(res.docs))
        .then(callback);
}

function createBoosterList(data) {
    const estimates = {
        "B1001": "B1001 *",
        "B1002": "B1002 *",
        "B1003": "B1003 *",
        "B1004": "B1004 *",
        "B1005": "B1005 *",
        "B1006": "B1006 *",
        "B1007": "B1007 *",
        "B1008": "B1008 *",
        "Merlin1A": "F1-1 *",
        "Merlin2A": "F1-2 *",
        "Merlin1C": "F1-3 *",
        "Merlin2C": "F1-4 *",
        "Merlin3C": "F1-5 *"
    };

    const versions = {
        "B0003": "First Falcon 9 1.0",
        "B1003 *": "First Falcon 9 1.1",
        "B1019": "First Falcon 9 Full Thrust",
        "B1039": "First Falcon 9 FT Block 4",
        "B1046": "First Falcon 9 FT Block 5"
    };

    const energy = {
        "VLEO": 1.0,
        "LEO": 1.0,
        "SO": 1.0,
        "PO": 1.03,
        "SSO": 1.07,
        "ISS": 0.95,
        "MEO": 1.2,
        "GTO": 1.4,
        "GEO": 1.4,
        "ES-L1": 1.5,
        "HEO": 1.5,
        "HCO": 1.5,
        "???": 1
    };

    let maxenergy = 0;
    let _boosters = {};

    for (let flight of data) {
        for (let stage of flight.cores) {
            if (!stage.core) {
                continue;
            }

            let booster = {
                missions: [],
                energy: 0,
                available: true
            };

            let name = stage.core.serial;
            if (!name) continue;

            if (estimates[name]) {
                name = estimates[name];
            }

            if (_boosters[name]) {
                booster = _boosters[name];
            }

            let mission = {
                success: "expended"
            };

            mission.name = flight.payloads.map(x => x.name).join(", ");

            booster.name = name;
            mission.launcher = flight.rocket.name;
            mission.date = new Date(flight.date_local);
            mission.site = flight.launchpad.name;

            let orbit = flight.payloads && flight.payloads[0];
            if (orbit) {
                mission.periapsis = orbit.periapsis_km;
                mission.apoapsis = orbit.apoapsis_km;
                mission.inclination = orbit.inclination_deg;
                mission.orbit = orbit.orbit || "???";
            }
            else {
                mission.periapsis = "???";
                mission.apoapsis = "???";
                mission.inclination = "???";
                mission.orbit = "???";
            }

            if (flight.payloads) {
                let mass = 0;
                flight.payloads.forEach(pl => {
                    if (pl.mass_kg) {
                        mass += pl.mass_kg;
                    }
                });
                mission.mass = (mass == 0 ? "???" : mass);
            }
            else {
                mission.mass = "???";
            }

            mission.energy = energy[mission.orbit] || 1;
            mission.flightNumber = flight.flight_number;

            if (!flight.success) {
                mission.success = "failure";
            }

            if (stage.landing_success) {
                if (stage.landing_type == "ASDS") {
                    mission.success = "success-sea";
                }
                else {
                    mission.success = "success-land";
                }
            }
            else {
                if (stage.landing_attempt && flight.success) {
                    if (stage.landing_type == "ASDS") {
                        mission.success = "landing-failure-sea";
                    }
                    else {
                        mission.success = "landing-failure-land";
                    }
                }

                booster.available = false;
            }

            if (flight.is_tentative || flight.success == null) {
                mission.success = "tentative";
                booster.available = true;
            }

            booster.energy += mission.energy;
            booster.missions.push(mission);

            if (maxenergy < booster.energy) maxenergy = booster.energy;

            _boosters[name] = booster;
        }
    }

    let block = "First Falcon 1";
    for (let name in _boosters) {
        let booster = _boosters[name];

        if (versions[name]) {
            block = versions[name];
        }

        booster.block = block;

        booster.missions.sort((a, b) => {
            return a.date.getTime() - b.date.getTime()
        });

        booster.missions.forEach((mission, i) => {
            if (i == 0) {
                booster.missions[i].turnaround = 0;
            }
            else {
                booster.missions[i].turnaround = Math.round((mission.date.getTime() - booster.missions[i - 1].date.getTime()) / (1000 * 60 * 60 * 24));
            }
        });

        booster.energy = booster.energy / maxenergy;

        boosters.push(booster);
    }

    baseDate = boosters[0].missions[0].date;
    boosters.reverse();
}

const Modes = {
    list: 0,
    timeline: 1
};

var pageMode = Modes.list;

function changeMode() {
    if (pageMode == LIST_MODE) {
        document.getElementById("list").style.display = 'none';
        document.getElementById("timeline").style.display = 'block';
        document.getElementById("listMode").innerHTML = "TIMELINE";
        pageMode = TIMELINE_MODE;
    } else {
        document.getElementById("list").style.display = 'block';
        document.getElementById("timeline").style.display = 'none';
        document.getElementById("listMode").innerHTML = "LIST";
        pageMode = LIST_MODE;

    }
}

function initPage() {
    load(() => {
        document.getElementById("toggle").addEventListener("click", toggleTimeline);

        renderList();
    });
}

function toggleTimeline() {
    if (pageMode == Modes.list) {
        pageMode = Modes.timeline;

        document.getElementById("toggle").classList = "toggle toggle-on";

        renderTimeline();
    }
    else {
        pageMode = Modes.list;

        document.getElementById("toggle").classList = "toggle";

        renderList();
    }
}

initPage();
