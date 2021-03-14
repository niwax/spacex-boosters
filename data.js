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

function create(data) {
    let html = "";

    let boosters = {};



    function renderStats(stats) {
        let html = "";
        const numbers = ["1st flights", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"];
        const colors = ["rgb(90,80,70)", "rgb(80,75,71)", "rgb(70,70,72)", "rgb(60,65,73)"];

        for (let i in stats) {
            let f = Math.sqrt(i / 10) * 7;

            html += `
                <div class="statsbar" style="flex: ${stats[i]}; background-color: rgb(${90 - f * 10}, ${80 - f * 5}, ${70 + f * 1})">
                    ${numbers[i]}
                </div>
            `;
        }

        return `
            <div class="stats">
                ${html}
            </div>
        `;
    }

    let stats = {};

    for (let name in boosters) {
        if (boosters.hasOwnProperty(name)) {
            if (versions.hasOwnProperty(name)) {
                html =
                    `<div class="version">
                        ${versions[name]}
                    </div>
                    <div>
                        ${renderStats(stats)}
                    </div>` + html;
                stats = {};
            }

            let booster = boosters[name];

            let _html = `
                <li>
                    <span class="heat">
                        <span class="heat-indicator">
                            <img src="booster.png" />
                            <span style="opacity: ${Math.sqrt(booster.energy / maxenergy)}">
                                <img src="soot.png" />
                            </span>
                        </span>
                        <span class="flight-number">${booster.missions.length}</span>
                    </span>
                    <span class="name ${booster.available ? "" : "notAvailable"}">${booster.name}</span>
                    <span class="missionList">`;

            let lastMissionDate = new Date();

            for (let i = 0; i < booster.missions.length; i++) {
                if (stats.hasOwnProperty(i)) {
                    stats[i]++;
                }
                else {
                    stats[i] = 1;
                }
                console.log(JSON.stringify(stats), booster.name);

                let mission = booster.missions[i];

                if (i > 0) {
                    let turnaround = Math.round((new Date(mission.isoDate).getTime() - lastMissionDate.getTime()) / (1000 * 60 * 60 * 24));
                    _html += `
                    <span class="turnaround-spacer" style="width: ${turnaround / 3.5}px">
                        <div class="turnaround-flex">
                            <div class="turnaround-line"></div>
                            <div class="turnaround-label">${turnaround}</div>
                            <div class="turnaround-line"></div>
                        </div>
                    </span>
                    `;
                }

                _html += `
                    <span class="mission ${mission.success}">
                        ${mission.orbit}
                        <span class="description">
                            <h6>${mission.name}</h6>
                            <p>Date: ${mission.date}</p>
                            <p>Launcher: ${mission.launcher}</p>
                            <p>Launch Pad: ${mission.site}</p>
                            <p>Target Orbit: ${(mission.periapsis == undefined || mission.periapsis == 0) ?
                        "unknown" :
                        "" + Math.round(mission.periapsis) + "kmx" + Math.round(mission.apoapsis) + "km " + Math.round(mission.inclination) + "°"
                    }</p>
                            <p>Mass: ${(mission.mass == undefined) ?
                        "unknown" :
                        "" + mission.mass + "kg"
                    }</p>
                        </span>
                    </span>`;

                lastMissionDate = new Date(mission.isoDate);
                lastLastMissionDate = (lastLastMissionDate.getTime() < new Date(mission.isoDate).getTime() ? new Date(mission.isoDate) :
                    lastLastMissionDate);
            }
            _html += "</span></li>";

            html = _html + html;
        }
    }

    html =
        `<div>
            ${renderStats(stats)}
        </div>` + html;

    html = `
        <li class="header">
            <span>
                <span class="mission success-land">RTLS</span>
                <span class="mission success-sea">ASDS</span>
                <span class="mission expended">Expended</span>
                <span class="mission landing-failure">Landing failure</span>
                <span class="mission failure">Failure</span>
                <span class="mission tentative">Planned</span>
                <span style="color: #777">Hover for more info</span>
            </span>
        </li>` + html;

    document.getElementById("list").innerHTML = html;

    let html_body = '';
    let html_head = '';
    let maxX = 0;
    for (let name in boosters) {
        if (boosters.hasOwnProperty(name)) {
            /*if (versions.hasOwnProperty(name)) {
                html =
                    `<div class="version">
                        ${versions[name]}
                    </div>
                    <div>
                        ${renderStats(stats)}
                    </div>` + html;
                stats = {};
            }*/

            let booster = boosters[name];

            let _html_line = `
                <div class="booster-line" id="${name}_body"
                    onmousedown="startScroll(event);"
                    onmouseup="endScroll(event);"
                    onmousemove="updateScroll(event);">
                    `;

            let _html_head = `
                <div class="booster-line-head" id="${name}_head">
                        <span class="heat">
                            <span class="heat-indicator">
                                <img src="booster.png" />
                                <span style="opacity: ${Math.sqrt(booster.energy / maxenergy)}">
                                    <img src="soot.png" />
                                </span>
                            </span>
                            <span class="flight-number">${booster.missions.length}</span>
                        </span>
                        <span class="name ${booster.available ? "" : "notAvailable"}">${booster.name}</span>
                </div>`;

            for (let i = 0; i < booster.missions.length; i++) {
                if (stats.hasOwnProperty(i)) {
                    stats[i]++;
                }
                else {
                    stats[i] = 1;
                }

                let mission = booster.missions[i];
                let missionX = Math.round((new Date(mission.isoDate).getTime() - timeline_start_date.getTime()) / (1000 * 60 * 60 * 24));
                maxX = (maxX > missionX + ADD_X ? maxX : missionX + ADD_X);

                _html_line += `
                    <span class="mission ${mission.success}" style="left:${missionX}px;">
                        ${mission.orbit}
                        <span class="flightnumber">&nbsp;${i + 1}&nbsp;</span>
                        <span class="description" id="${name + i}">
                            <h6>${mission.name}</h6>
                            <p>Date: ${mission.date}</p>
                            <p>Launcher: ${mission.launcher}</p>
                            <p>Launch Pad: ${mission.site}</p>
                            <p>Target Orbit: ${(mission.periapsis == undefined || mission.periapsis == 0) ?
                        "unknown" :
                        "" + Math.round(mission.periapsis) + "kmx" + Math.round(mission.apoapsis) + "km " + Math.round(mission.inclination) + "°"
                    }</p>
                            <p>Mass: ${(mission.mass == undefined) ?
                        "unknown" :
                        "" + mission.mass + "kg"
                    }</p>
                        </span>
                    </span>`;

            }
            _html_line += "</div>";

            html_body = _html_line + html_body;
            html_head = _html_head + html_head;
        }
    }
    let _html_time_line = `
                <div class="booster-line" id="time"
                    onmousedown="startScroll(event);"
                    onmouseup="endScroll(event);"
                    onmousemove="updateScroll(event);" style="width:${maxX}px;"> </div>
                    `;

    let _html_time_head = `
                <div class="booster-line-head" id="time_head">
                        <span class="heat">
                            <span class="heat-indicator">
                                <img src="booster.png" />
                            </span>
                            <span class="flight-number"> </span>
                        </span>
                        <span class="name">TIME</span>
                </div>`;

    document.getElementById("timeline-body-inner").innerHTML = _html_time_line + html_body;
    document.getElementById("timeline-body-inner").style.width = maxX + 'px';
    maxTimeLineWidth = maxX;
    document.getElementById("timeline-head").innerHTML = _html_time_head + html_head + "<div class=\"spacer\"></div>";
    updateBoosterLines();
    glob_boosters = boosters;

    let canvas = document.getElementById("timelineBg");
    canvas.width = maxX;
    canvas.height = 40.8;
    canvas.style.width = "" + maxX + "px";
    canvas.style.height = "40.8px";
    let canvasM = document.getElementById("timelineMonthsBg");
    canvasM.width = maxX;
    canvasM.height = 40.8;
    canvasM.style.width = "" + maxX + "px";
    canvasM.style.height = "40.8px";

    ctx = canvas.getContext('2d');
    ctxM = canvasM.getContext('2d');
    /*ctx.fillStyle="#FF00FF";
    ctx.fillRect(0,0, 40,20);*/

    var dateStrEnding = "-01T00:00:00+12:00";            // new Date('2006-01-01T00:00:00+12:00');
    let year = 2006;
    let month = 1;
    let actDate;
    ctx.font = "30px Verdana";
    ctxM.font = "20px Verdana";
    ctxM.fillStyle = "#2F2F2F";
    let monthsC = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'N', 'O', 'D'];

    do {
        actdatestr = "" + year + "-" + (month < 10 ? "0" : "") + month + dateStrEnding;
        actDate = new Date(actdatestr);
        let posX = Math.round((new Date(actdatestr).getTime() - timeline_start_date.getTime()) / (1000 * 60 * 60 * 24));
        ctx.fillStyle = "#2F2F2F";
        ctx.fillRect(posX, 0, 2, 400);
        if (month == 1) {
            ctx.fillStyle = "#3F3F3F";
            ctx.fillRect(posX, 0, 5, 400);
            ctx.fillText("" + year, posX + 5, 33);
        }
        ctx.fillStyle = "#4a4131";
        ctxM.fillText(monthsC[month - 1], posX + 10, 33);
        month++;
        if (month > 12) {
            year++;
            month = 1;
        }
    } while (actDate.getTime() < lastLastMissionDate.getTime());
    let dataUrl = canvas.toDataURL();
    document.getElementById("timeline-body-inner").style.background = 'url(' + dataUrl + ')';
    dataUrl = canvasM.toDataURL();
    document.getElementById("time").style.background = 'url(' + dataUrl + ')';
    updateBoosterLines();
}

var scrollFromX = -1;
var scrolling = false;
var leftStart = 0;
var ctx;
var lastScrollX = -1;
var lastScrollDate = null;
var v = 0;

function getCssProperty(elmId, property) {
    let elem = document.getElementById(elmId);
    return window.getComputedStyle(elem, null).getPropertyValue(property);
}

function startScroll(m_ev) {
    v = 0;
    scrollFromX = m_ev.clientX;
    lastScrollX = scrollFromX;
    lastScrollDate = new Date();

    leftStart = parseInt(getCssProperty("timeline-body-inner", "left"));
    //console.log('start:'+leftStart);
    scrolling = true;
}

function updateScroll(m_ev) {
    if (!scrolling) {
        return;
    }
    let actScrollX = m_ev.clientX;
    let toX = leftStart + m_ev.clientX - scrollFromX;
    let scrollDate = new Date();
    v = (actScrollX - lastScrollX) / (scrollDate.getTime() - lastScrollDate.getTime());
    console.log("v:" + v);
    lastScrollDate = scrollDate;
    lastScrollX = actScrollX;

    setScroll(toX);
}

var actToX;

function setScroll(toX) {
    let ret = false;
    if (toX <= 0 && toX >= -1 * (maxTimeLineWidth - 700)) {
        actToX = toX;
        ret = true;
    } else if (toX >= 0) {
        actToX = 0;
    } else {
        actToX = (-1 * (maxTimeLineWidth - 700));
    }
    document.getElementById("timeline-body-inner").style.left = actToX + 'px';
    updateBoosterLines();
    return ret;
}

function slowingScroll() {
    if (scrolling)
        return;
    let step = (v > 0 ? -0.05 : 0.05);
    if (Math.abs(v) < Math.abs(step)) {
        v = 0;
        return;
    }
    v += step;
    console.log("slowing:" + v);
    actToX += v * 10;
    let inScroll = setScroll(actToX);
    if (inScroll) {
        setTimeout(slowingScroll, 10);
    }
}


function endScroll() {
    scrolling = false;

    if (Math.abs(v) > 0.2) {
        setTimeout(slowingScroll, 10);
    }
}

function updateBoosterLines() {
    let scrollValue = -1 * parseInt(document.getElementById("timeline-body-inner").style.left);
    if (scrollValue == undefined || scrollValue == null || scrollValue === NaN) {
        scrollValue = 0;
    }
    for (let name in glob_boosters) {
        let booster = glob_boosters[name];
        let min_X = 1000000;
        let max_X;
        for (let i = 0; i < booster.missions.length; i++) {
            let mission = booster.missions[i];
            let missionX = Math.round((new Date(mission.isoDate).getTime() - timeline_start_date.getTime()) / (1000 * 60 * 60 * 24));
            if (missionX < scrollValue + 600 && missionX > scrollValue) {
                let desc = document.getElementById(name + i);
                if (missionX > scrollValue + 300) {
                    desc.className = "descriptionotherside";
                } else {
                    desc.className = "description";
                }
            }
            min_X = (min_X < missionX ? min_X : missionX);
            max_X = (max_X > missionX + ADD_X ? max_X : missionX);
        }
        if (min_X < scrollValue + 600 && max_X > scrollValue) {
            //console.log('show'+min_X+"-"+max_X+" : "+scrollValue);
            document.getElementById(name + '_body').style.display = 'block';
            document.getElementById(name + '_head').style.display = 'flex';
        } else {
            document.getElementById(name + '_body').style.display = 'none';
            document.getElementById(name + '_head').style.display = 'none';
        }
    }
    for (let name in glob_boosters) {
        let booster = glob_boosters[name];
        for (let i = 0; i < booster.missions.length; i++) {
            document.getElementById(name + '_body').selectionStart = 0;
            document.getElementById(name + '_body').selectionEnd = 0;
        }
    }
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
