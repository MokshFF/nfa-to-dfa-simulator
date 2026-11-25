/**
 * INTERACTIVE VECTOR GRAPH RENDERER FOR AUTOMATA
 * Renders SVG state diagrams with draggable nodes, curved edges, self-loops, and accept rings.
 */

class AutomataGraphRenderer {
    constructor(svgContainerId, options = {}) {
        this.container = document.getElementById(svgContainerId);
        if (!this.container) {
            console.error(`SVG container #${svgContainerId} not found.`);
            return;
        }

        this.options = Object.assign({
            nodeRadius: 28,
            themeColor: '#00f2fe',
            accentColor: '#9b51e0',
            acceptColor: '#00f5a0',
            activeColor: '#ffb703',
            textColor: '#f1f5f9'
        }, options);

        this.nodes = []; // { id, label, subLabel, x, y, isStart, isAccept, isActive }
        this.edges = []; // { from, to, symbols: [], isActive }
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.viewBox = { x: 0, y: 0, width: 800, height: 500 };
        this.zoomLevel = 1;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        this.initSVG();
        this.setupEventListeners();
    }

    initSVG() {
        this.container.innerHTML = `
            <svg class="automata-svg" viewBox="0 0 800 500" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <marker id="arrow-${this.container.id}" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#64748b" class="arrow-marker" />
                    </marker>
                    <marker id="arrow-active-${this.container.id}" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ffb703" />
                    </marker>
                    <marker id="start-arrow-${this.container.id}" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
                        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#00f2fe" />
                    </marker>
                    <filter id="glow-${this.container.id}" x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                <rect class="svg-bg" width="100%" height="100%" fill="transparent" />
                <g class="viewport-group">
                    <g class="edges-group"></g>
                    <g class="nodes-group"></g>
                </g>
            </svg>
        `;

        this.svg = this.container.querySelector('svg');
        this.viewportGroup = this.svg.querySelector('.viewport-group');
        this.edgesGroup = this.svg.querySelector('.edges-group');
        this.nodesGroup = this.svg.querySelector('.nodes-group');
        this.updateViewBox();
    }

    updateViewBox() {
        this.svg.setAttribute('viewBox', `${this.viewBox.x} ${this.viewBox.y} ${this.viewBox.width} ${this.viewBox.height}`);
    }

    resetView() {
        this.viewBox = { x: 0, y: 0, width: 800, height: 500 };
        this.zoomLevel = 1;
        this.updateViewBox();
    }

    zoom(delta) {
        const factor = delta > 0 ? 0.85 : 1.15;
        const newW = this.viewBox.width * factor;
        const newH = this.viewBox.height * factor;
        // Zoom centered on canvas
        this.viewBox.x += (this.viewBox.width - newW) / 2;
        this.viewBox.y += (this.viewBox.height - newH) / 2;
        this.viewBox.width = newW;
        this.viewBox.height = newH;
        this.updateViewBox();
    }

    /**
     * Loads automaton data into the renderer
     */
    setData(states, alphabet, transitions, startState, acceptStates, subsetMapping = {}) {
        this.nodes = [];
        this.edges = [];

        if (!states || states.length === 0) {
            this.render();
            return;
        }

        // Layout nodes in an elliptical / circular layout
        const centerX = 400;
        const centerY = 250;
        const count = states.length;
        const radiusX = Math.min(300, 70 + count * 35);
        const radiusY = Math.min(180, 50 + count * 25);

        states.forEach((s, i) => {
            let x, y;
            if (count === 1) {
                x = centerX;
                y = centerY;
            } else {
                // Initial state on the left
                const angle = (2 * Math.PI / count) * i - Math.PI;
                x = centerX + radiusX * Math.cos(angle);
                y = centerY + radiusY * Math.sin(angle);
            }

            const sub = subsetMapping[s];
            let subLabel = '';
            if (sub && Array.isArray(sub)) {
                subLabel = sub.length === 0 ? '∅' : `{${sub.join(',')}}`;
            }

            this.nodes.push({
                id: s,
                label: s,
                subLabel: subLabel,
                x: Math.round(x),
                y: Math.round(y),
                isStart: s === startState,
                isAccept: acceptStates.includes(s),
                isActive: false
            });
        });

        // Group transitions: from -> to -> [symbols]
        const edgeMap = new Map();

        for (const [from, symMap] of Object.entries(transitions || {})) {
            for (const [sym, targets] of Object.entries(symMap || {})) {
                const targetList = Array.isArray(targets) ? targets : (targets ? [targets] : []);
                for (const to of targetList) {
                    if (!to || !states.includes(to)) continue;
                    const key = `${from}-->${to}`;
                    if (!edgeMap.has(key)) {
                        edgeMap.set(key, { from, to, symbols: [] });
                    }
                    if (!edgeMap.get(key).symbols.includes(sym)) {
                        edgeMap.get(key).symbols.push(sym);
                    }
                }
            }
        }

        this.edges = Array.from(edgeMap.values()).map(e => ({
            from: e.from,
            to: e.to,
            label: e.symbols.sort().join(', '),
            isActive: false
        }));

        this.render();
    }

    render() {
        this.renderEdges();
        this.renderNodes();
    }

    renderNodes() {
        this.nodesGroup.innerHTML = '';
        const r = this.options.nodeRadius;

        this.nodes.forEach(node => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', `graph-node ${node.isActive ? 'active' : ''} ${node.isAccept ? 'accept' : ''}`);
            g.setAttribute('data-id', node.id);
            g.setAttribute('transform', `translate(${node.x}, ${node.y})`);

            // Start state arrow
            if (node.isStart) {
                const startArrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                startArrow.setAttribute('d', `M -${r + 35} 0 L -${r + 2} 0`);
                startArrow.setAttribute('stroke', '#00f2fe');
                startArrow.setAttribute('stroke-width', '3');
                startArrow.setAttribute('marker-end', `url(#start-arrow-${this.container.id})`);
                g.appendChild(startArrow);

                const startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                startText.setAttribute('x', `-${r + 42}`);
                startText.setAttribute('y', '4');
                startText.setAttribute('fill', '#00f2fe');
                startText.setAttribute('font-size', '11');
                startText.setAttribute('font-weight', '700');
                startText.setAttribute('text-anchor', 'end');
                startText.textContent = 'START';
                g.appendChild(startText);
            }

            // Outer accept ring if accept state
            if (node.isAccept) {
                const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                outerCircle.setAttribute('r', r);
                outerCircle.setAttribute('class', 'node-accept-outer');
                outerCircle.setAttribute('fill', 'rgba(0, 245, 160, 0.08)');
                outerCircle.setAttribute('stroke', '#00f5a0');
                outerCircle.setAttribute('stroke-width', '2.5');
                if (node.isActive) outerCircle.setAttribute('filter', `url(#glow-${this.container.id})`);
                g.appendChild(outerCircle);
            }

            // Main inner circle
            const mainCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            mainCircle.setAttribute('r', node.isAccept ? r - 5 : r);
            mainCircle.setAttribute('class', 'node-circle');
            mainCircle.setAttribute('fill', node.isActive ? '#1e293b' : '#0f172a');
            mainCircle.setAttribute('stroke', node.isActive ? '#ffb703' : (node.isAccept ? '#00f5a0' : '#38bdf8'));
            mainCircle.setAttribute('stroke-width', node.isActive ? '3.5' : '2');
            if (node.isActive) mainCircle.setAttribute('filter', `url(#glow-${this.container.id})`);
            g.appendChild(mainCircle);

            // Node label text
            const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            labelText.setAttribute('class', 'node-label');
            labelText.setAttribute('y', node.subLabel ? '-3' : '5');
            labelText.setAttribute('text-anchor', 'middle');
            labelText.setAttribute('fill', node.isActive ? '#ffb703' : '#f8fafc');
            labelText.setAttribute('font-size', '14');
            labelText.setAttribute('font-weight', '700');
            labelText.textContent = node.label;
            g.appendChild(labelText);

            // Subtitle text (for composite subset e.g. {q0, q1})
            if (node.subLabel) {
                const subText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                subText.setAttribute('class', 'node-sublabel');
                subText.setAttribute('y', '13');
                subText.setAttribute('text-anchor', 'middle');
                subText.setAttribute('fill', '#94a3b8');
                subText.setAttribute('font-size', '9.5');
                subText.setAttribute('font-family', 'monospace');
                subText.textContent = node.subLabel;
                g.appendChild(subText);
            }

            this.nodesGroup.appendChild(g);
        });
    }

    renderEdges() {
        this.edgesGroup.innerHTML = '';
        const r = this.options.nodeRadius;

        this.edges.forEach(edge => {
            const sourceNode = this.nodes.find(n => n.id === edge.from);
            const targetNode = this.nodes.find(n => n.id === edge.to);
            if (!sourceNode || !targetNode) return;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            g.setAttribute('class', `graph-edge ${edge.isActive ? 'active' : ''}`);

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

            if (edge.from === edge.to) {
                // SELF-LOOP
                const x = sourceNode.x;
                const y = sourceNode.y - r;
                const loopRadius = 24;
                const d = `M ${x - 12} ${y + 2} C ${x - 30} ${y - loopRadius * 2}, ${x + 30} ${y - loopRadius * 2}, ${x + 12} ${y + 2}`;
                
                path.setAttribute('d', d);
                path.setAttribute('marker-end', `url(#arrow-${edge.isActive ? 'active-' : ''}${this.container.id})`);
                path.setAttribute('stroke', edge.isActive ? '#ffb703' : '#64748b');
                path.setAttribute('stroke-width', edge.isActive ? '3' : '1.8');
                path.setAttribute('fill', 'none');

                label.setAttribute('x', x);
                label.setAttribute('y', y - loopRadius * 1.5);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('class', 'edge-label');
                label.setAttribute('fill', edge.isActive ? '#ffb703' : '#e2e8f0');
                label.setAttribute('font-size', '12');
                label.setAttribute('font-weight', '600');
                label.textContent = edge.label;
            } else {
                // DIRECTED EDGE (Straight or Curved if bidirectional)
                const hasReverse = this.edges.some(e => e.from === edge.to && e.to === edge.from);
                const dx = targetNode.x - sourceNode.x;
                const dy = targetNode.y - sourceNode.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist === 0) return;

                // Adjust endpoints so arrows sit right outside node boundary
                const ux = dx / dist;
                const uy = dy / dist;

                let d = '';
                let labelX = 0;
                let labelY = 0;

                if (hasReverse) {
                    // Curved quadratic Bézier
                    const perpX = -uy;
                    const perpY = ux;
                    const curvature = Math.min(45, dist * 0.22);
                    const ctrlX = (sourceNode.x + targetNode.x) / 2 + perpX * curvature;
                    const ctrlY = (sourceNode.y + targetNode.y) / 2 + perpY * curvature;

                    const startX = sourceNode.x + ux * (r - 2);
                    const startY = sourceNode.y + uy * (r - 2);
                    const endX = targetNode.x - ux * (r + 4);
                    const endY = targetNode.y - uy * (r + 4);

                    d = `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
                    labelX = ctrlX + perpX * 6;
                    labelY = ctrlY + perpY * 6 + 4;
                } else {
                    // Straight line
                    const startX = sourceNode.x + ux * (r - 2);
                    const startY = sourceNode.y + uy * (r - 2);
                    const endX = targetNode.x - ux * (r + 4);
                    const endY = targetNode.y - uy * (r + 4);

                    d = `M ${startX} ${startY} L ${endX} ${endY}`;
                    // Offset label perpendicular to line slightly
                    const perpX = -uy * 14;
                    const perpY = ux * 14;
                    labelX = (startX + endX) / 2 + perpX;
                    labelY = (startY + endY) / 2 + perpY + 4;
                }

                path.setAttribute('d', d);
                path.setAttribute('marker-end', `url(#arrow-${edge.isActive ? 'active-' : ''}${this.container.id})`);
                path.setAttribute('stroke', edge.isActive ? '#ffb703' : '#64748b');
                path.setAttribute('stroke-width', edge.isActive ? '3' : '1.8');
                path.setAttribute('fill', 'none');

                label.setAttribute('x', labelX);
                label.setAttribute('y', labelY);
                label.setAttribute('text-anchor', 'middle');
                label.setAttribute('class', 'edge-label');
                label.setAttribute('fill', edge.isActive ? '#ffb703' : '#e2e8f0');
                label.setAttribute('font-size', '12');
                label.setAttribute('font-weight', '600');
                label.textContent = edge.label;
            }

            g.appendChild(path);
            g.appendChild(label);
            this.edgesGroup.appendChild(g);
        });
    }

    setupEventListeners() {
        const getSvgPoint = (evt) => {
            const pt = this.svg.createSVGPoint();
            pt.x = evt.clientX;
            pt.y = evt.clientY;
            return pt.matrixTransform(this.svg.getScreenCTM().inverse());
        };

        // Node dragging
        this.svg.addEventListener('mousedown', (e) => {
            const nodeElem = e.target.closest('.graph-node');
            if (nodeElem) {
                const nodeId = nodeElem.getAttribute('data-id');
                this.draggedNode = this.nodes.find(n => n.id === nodeId);
                if (this.draggedNode) {
                    const pt = getSvgPoint(e);
                    this.dragOffset.x = pt.x - this.draggedNode.x;
                    this.dragOffset.y = pt.y - this.draggedNode.y;
                }
                e.stopPropagation();
            } else {
                // Pan viewport
                this.isPanning = true;
                this.panStart = { x: e.clientX, y: e.clientY };
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.draggedNode) {
                const pt = getSvgPoint(e);
                this.draggedNode.x = Math.round(pt.x - this.dragOffset.x);
                this.draggedNode.y = Math.round(pt.y - this.dragOffset.y);
                this.render();
            } else if (this.isPanning) {
                const dx = (e.clientX - this.panStart.x) * (this.viewBox.width / this.svg.clientWidth);
                const dy = (e.clientY - this.panStart.y) * (this.viewBox.height / this.svg.clientHeight);
                this.viewBox.x -= dx;
                this.viewBox.y -= dy;
                this.panStart = { x: e.clientX, y: e.clientY };
                this.updateViewBox();
            }
        });

        window.addEventListener('mouseup', () => {
            this.draggedNode = null;
            this.isPanning = false;
        });

        // Mouse wheel zoom
        this.container.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.zoom(e.deltaY > 0 ? -1 : 1);
        }, { passive: false });
    }

    highlightState(stateId) {
        this.nodes.forEach(n => n.isActive = (n.id === stateId));
        this.render();
    }

    highlightEdge(fromId, toId) {
        this.edges.forEach(e => e.isActive = (e.from === fromId && e.to === toId));
        this.render();
    }

    clearHighlights() {
        this.nodes.forEach(n => n.isActive = false);
        this.edges.forEach(e => e.isActive = false);
        this.render();
    }
}

if (typeof window !== 'undefined') {
    window.AutomataGraphRenderer = AutomataGraphRenderer;
}
