const styles = `
    .diffstat {
        float: right;
    }
    .diffstat-conflicts {
        margin-left: 0.5em;
        color: #c78f24;    
    }
    .diffstat-conflicts:after {
        content: ' conflicts';    
    }
    .diffstat-additions {
        margin-left: 0.5em;
        color: #44b340;    
    }
    .diffstat-additions:before {
        content: '+';    
    }
    .diffstat-deletions {
        margin-left: 0.5em;
        color: #b3595e;    
    }
    .diffstat-deletions:before {
        content: '-';    
    }
    
    .diffstat-bar {
        display: inline-block;
        margin-left: 0.1em;
        width: 0.5em;
        height: 0.5em;
        vertical-align:0.1em;
        background: gray;     
    }
        
    .diffstat-bar.deletion {
        background: #b3595e;
    }
    .diffstat-bar.addition {
        background: #44b340;
    }
`;

function clamp(min, max, value) {
    return Math.max(Math.min(max, value), min);
}

function getBars(additionsCount, deletionsCount) {
    const standardLineCount = 1000;
    const barCount          = 5;
    const total             = additionsCount + deletionsCount;

    const min = 1;
    const max = barCount - 1;
    let adds;
    let dels;
    let neutrals;

    if (total > standardLineCount) {
        adds     = clamp(min, max, Math.round(additionsCount / total * barCount));
        dels     = clamp(min, max, Math.round(deletionsCount / total * barCount));
    } else {
        adds     = clamp(min, max, Math.round(additionsCount / (total + standardLineCount) * barCount));
        dels     = clamp(min, max, Math.round(deletionsCount / (total + standardLineCount) * barCount));
    }

    neutrals = barCount - adds - dels;


    const bars = [];

    for (let i = 0; i < adds; i++) {
        bars.push('<span class="diffstat-bar addition"></span>');
    }

    for (let i = 0; i < dels; i++) {
        bars.push('<span class="diffstat-bar deletion"></span>');
    }

    for (let i = 0; i < neutrals; i++) {
        bars.push('<span class="diffstat-bar"></span>');
    }

    return '&nbsp;&nbsp;' + bars.join('');
}

function render(additionsCount, deletionsCount, conflictsCount) {
    const stats = [
        conflictsCount && `<span class="diffstat-conflicts">${conflictsCount}</span>`,
        additionsCount && `<span class="diffstat-additions">${additionsCount}</span>`,
        deletionsCount && `<span class="diffstat-deletions">${deletionsCount}</span>`,
        getBars(additionsCount, deletionsCount)
    ].filter(Boolean);

    const span = document.createElement('span');
    span.classList.add('diffstat');
    span.innerHTML = stats.join('');

    return span;
}

module.exports = {
    render,
    styles
};
