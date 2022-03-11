function renderList() {
    let lastBlock = boosters[0].block;
    let html = "";

    for (let booster of boosters) {
        if (html == "") {
            html += renderStats(lastBlock);
        }

        if (booster.block != lastBlock) {
            html += `<div class="block-upgrade">${lastBlock}</div>`
            lastBlock = booster.block;
            html += renderStats(lastBlock);
        }

        html += renderBooster(booster);
    }

    html += `<div class="block-upgrade">First Falcon 1</div>`

    document.getElementById("main").innerHTML = html;
    document.getElementById("main").classList = "main-list";
    document.getElementById("main").style.width = "";
    document.getElementById("spacer-left").classList = "hidden";
    document.getElementById("spacer-right").classList = "hidden";
}

function renderStats(block) {
    let html = "";
    const numbers = ["1st flights", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th"];

    let stats = {};

    for (let booster of boosters) {
        if (booster.block == block) {
            booster.missions.forEach((_, i) => {
                if (stats[i]) {
                    stats[i]++;
                }
                else {
                    stats[i] = 1;
                }
            });
        }
    }

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

function renderBooster(booster) {
    return `
        <div class="booster">
            <div class="indicator">
                <div class="indicator-inner" style="height: ${booster.energy * 100}%"></div>
                <div class="indicator-number">
                    ${booster.missions.length}
                </div>
            </div>
            <div class="name ${booster.available || "unavailable"}">
                ${booster.name}
            </div>
            <div class="missions">
                ${booster.missions.map(
                    (mission) => {
                        return renderGap(mission) + renderMission(mission);
                    }
                ).join("")}
            </div>
        </div>
    `;
}

function renderGap(mission) {
    if (mission.turnaround == 0) {
        return "";
    }

    return `
        <div class="turnaround" style="min-width: ${mission.turnaround / 2.5}px">
            <div class="spacer"></div>
            ${mission.turnaround}
            <div class="spacer"></div>
        </div>
    `;
}

function renderMission(mission) {
    return `
        <div class="mission ${mission.success}">
            ${mission.orbit}

            <div class="description">
                <h6>${mission.name}</h6>
                <p>Date: ${mission.date.toLocaleString()}</p>
                <p>Vehicle: ${mission.launcher}</p>
                <p>Launch Pad: ${mission.site}</p>
                <p>Target Orbit: ${Math.round(mission.periapsis) + "kmx" + Math.round(mission.apoapsis) + "km " + Math.round(mission.inclination) + "°"}</p>
                <p>Mass: ${mission.mass}kg</p>
            </div>
        </div>
    `;
}
