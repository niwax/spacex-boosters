function renderTimeline() {
    let lastBlock = boosters[0].block;
    let html = "";
    let i = 0;

    html = renderTimelineYears();

    for (let booster of boosters) {
        if (i == 0) {
            html += renderStats(lastBlock);
        }
        i++;

        if (booster.block != lastBlock) {
            html += `<div class="block-upgrade">${lastBlock}</div>`
            lastBlock = booster.block;
            html += renderStats(lastBlock);
        }

        html += renderTimelineBooster(booster);
    }

    html += `<div class="block-upgrade">First Falcon 1</div>`

    document.getElementById("main").innerHTML = html;
    document.getElementById("main").classList = "main-timeline";
    document.getElementById("spacer-left").classList = "";
    document.getElementById("spacer-right").classList = "";

    let maxDate = new Date();
    boosters.forEach(booster => {
        booster.missions.forEach(mission => {
            if (mission.date > maxDate) {
                maxDate = mission.date;
            }
        });
    });

    let maxSize = Math.round((maxDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24) * 2 + 250 + window.innerWidth - 800);
    document.getElementById("main").style.width = maxSize + "px";

    maxSize = Math.round((new Date().getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24) * 2 + 250 + window.innerWidth - 800);
    window.setTimeout(_ => {
        window.scrollTo({ top: 0, left: maxSize - window.innerWidth - 400, behavior: "smooth" });
    }, 100);
}

function renderTimelineYears() {
    let html1 = "";
    let html2 = "";
    let min = 2010;
    let max = 2010;

    boosters.forEach(booster => booster.missions.forEach(mission => {
        if (mission.date.getFullYear() < min) {
            min = mission.date.getFullYear();
        }
        if (mission.date.getFullYear() > max) {
            max = mission.date.getFullYear();
        }
    }));

    for (let i = min; i <= max; i++) {
        let position = Math.round((new Date(i, 0, 0).getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24) * 2 + 120);

        html1 += `
            <div class="date" style="left: ${position}px">
                ${i}
            </div>
        `;
        html2 += `
            <div class="dateline" style="left: ${position}px">
            </div>
        `;
    }

    return `
        <div class="dates">
            ${html1}
        </div>
        <div class="dates-low">
            ${html2}
        </div>
    `;
}

function renderTimelineBooster(booster) {
    return `
        <div class="booster">
            <div class="booster-text-outer">
                <div class="booster-text">
                    <div class="indicator">
                        <div class="indicator-inner" style="height: ${booster.energy * 100}%"></div>
                        <div class="indicator-number">
                            ${booster.missions.length}
                        </div>
                    </div>
                    <div class="name ${booster.available || "unavailable"}">
                        ${booster.name}
                    </div>
                </div>
            </div>
            <div class="missions">
                ${booster.missions.map(
                    (mission) => {
                        return renderTimelineGap(mission);
                    }
                ).join("")}
                ${booster.missions.map(
                    (mission, i) => {
                        return renderTimelineMission(mission, i);
                    }
                ).join("")}
            </div>
        </div>
    `;
}

function renderTimelineGap(mission) {
    if (mission.turnaround == 0) {
        return "";
    }

    let position = Math.round((mission.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24) * 2 - mission.turnaround * 2 + 120);

    return `
        <div class="turnaround" style="left: ${position}px; min-width: ${mission.turnaround * 2}px">
            <div class="spacer"></div>
            ${mission.turnaround}
            <div class="spacer"></div>
        </div>
    `;
}

function renderTimelineMission(mission, i) {
    let position = Math.round((mission.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24) * 2 + 120);

    return `
        <div class="mission-outer" style="left: ${position}px">
            <div class="mission ${mission.success}">
                ${mission.orbit}

                <div class="counter">
                    ${i + 1}
                </div>

                <div class="description">
                    <h6>${mission.name}</h6>
                    <p>Date: ${mission.date.toLocaleString()}</p>
                    <p>Vehicle: ${mission.launcher}</p>
                    <p>Launch Pad: ${mission.site}</p>
                    <p>Target Orbit: ${Math.round(mission.periapsis) + "kmx" + Math.round(mission.apoapsis) + "km " + Math.round(mission.inclination) + "°"}</p>
                    <p>Mass: ${mission.mass}kg</p>
                </div>
            </div>
        </div>
    `;
}
