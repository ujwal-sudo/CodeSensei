
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { GraphData, GraphNode } from '../types';
import { ZoomIn, ZoomOut, Maximize, RotateCcw, X } from 'lucide-react';

interface BrainMapProps {
  data: GraphData | null;
  highlightNodes?: string[];
  onNodeClick: (node: GraphNode) => void;
}

const BrainMap: React.FC<BrainMapProps> = ({ data, highlightNodes = [], onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Guard: do nothing if no valid data
    if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) return;
    if (!data.links || !Array.isArray(data.links)) return;

    // Build a Set of all valid node ids for O(1) lookup
    const nodeIds = new Set(data.nodes.map((n: any) => n.id));

    // Filter out any link that references a missing node
    const safeLinks = data.links.filter((link: any) => {
      const sourceId = typeof link.source === 'object'
        ? link.source.id
        : link.source;
      const targetId = typeof link.target === 'object'
        ? link.target.id
        : link.target;

      const valid = nodeIds.has(sourceId) && nodeIds.has(targetId);
      if (!valid) {
        console.warn('BrainMap: removing invalid link',
          sourceId, '→', targetId);
      }
      return valid;
    });

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = dimensions.width;
    const height = dimensions.height;

    // Defs for glow filter
    const defs = svg.append("defs");
    const glowFilter = defs.append("filter").attr("id", "glow");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const merge = glowFilter.append("feMerge");
    merge.append("feMergeNode").attr("in", "coloredBlur");
    merge.append("feMergeNode").attr("in", "SourceGraphic");

    // Zoom
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    const simulation = d3.forceSimulation(data.nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(safeLinks).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => getRadius(d) + 5));

    // Edges
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#434936")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.6);

    // Nodes
    const node = g.append("g")
      .selectAll("circle")
      .data(data.nodes)
      .join("circle")
      .attr("r", (d) => getRadius(d))
      .attr("fill", (d) => getNodeFill(d))
      .attr("stroke", (d) => getNodeStroke(d))
      .attr("stroke-width", (d) => d.group === 'file' ? 1 : d.group === 'module' ? 1.5 : 2)
      .attr("cursor", "pointer")
      .attr("filter", (d) => d.group === 'external' ? "url(#glow)" : "none")
      .call(drag(simulation) as any)
      .on("click", (event, d) => {
        setSelectedNode(d as GraphNode);
        onNodeClick(d as GraphNode);
        event.stopPropagation();
      })
      .on("mouseenter", function(event, d) {
        if ((d as GraphNode).group === 'file') {
          d3.select(this).attr("stroke", "#b7f34a");
        }
      })
      .on("mouseleave", function(event, d) {
        d3.select(this).attr("stroke", getNodeStroke(d as GraphNode));
      });

    // Labels
    const label = g.append("g")
      .selectAll("text")
      .data(data.nodes)
      .join("text")
      .attr("dy", (d) => -(getRadius(d) + 6))
      .attr("text-anchor", "middle")
      .text((d) => d.id)
      .attr("fill", (d) => d.group === 'external' ? '#F0EFFF' : d.group === 'module' ? '#8B8BA0' : '#3D3D55')
      .attr("font-size", (d) => d.group === 'external' ? '13px' : d.group === 'module' ? '11px' : '10px')
      .attr("font-family", (d) => d.group === 'external' ? 'Syne, sans-serif' : d.group === 'module' ? 'DM Sans, sans-serif' : 'JetBrains Mono, monospace')
      .attr("font-weight", (d) => d.group === 'external' ? '600' : '400')
      .style("pointer-events", "none");

    // Handle Highlighting
    if (highlightNodes.length > 0) {
      node.transition().duration(300)
        .attr("stroke", (d) => highlightNodes.includes(d.id) ? "#b7f34a" : getNodeStroke(d as GraphNode))
        .attr("stroke-width", (d) => highlightNodes.includes(d.id) ? 3 : 1.5);
    }

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);
      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

    // Click background to deselect
    svg.on("click", () => setSelectedNode(null));

    function drag(sim: d3.Simulation<d3.SimulationNodeDatum, undefined>) {
      return d3.drag()
        .on("start", (event: any) => { if (!event.active) sim.alphaTarget(0.3).restart(); event.subject.fx = event.subject.x; event.subject.fy = event.subject.y; })
        .on("drag", (event: any) => { event.subject.fx = event.x; event.subject.fy = event.y; })
        .on("end", (event: any) => { if (!event.active) sim.alphaTarget(0); event.subject.fx = null; event.subject.fy = null; });
    }

    return () => { simulation.stop(); };
  }, [data, dimensions, highlightNodes]);

  function getRadius(d: GraphNode): number {
    if (d.group === 'external') return 18;
    if (d.group === 'module') return 12;
    return 7;
  }
  function getNodeFill(d: GraphNode): string {
    if (d.group === 'external') return '#b7f34a';
    if (d.group === 'module') return '#1a1c1b';
    return '#121413';
  }
  function getNodeStroke(d: GraphNode): string {
    if (d.group === 'external') return '#b7f34a';
    if (d.group === 'module') return 'rgba(183, 243, 74, 0.5)';
    return '#434936';
  }

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, factor);
  };
  const handleReset = () => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(zoomRef.current.transform, d3.zoomIdentity);
  };

  if (!data) return <div className="flex-center h-full" style={{ color: 'var(--text-muted)' }}>Loading Graph...</div>;

  return (
    <div ref={containerRef} className="brain-map-container">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} style={{ width: '100%', height: '100%' }} />

      {/* Controls */}
      <div className="brain-map-controls">
        <button className="brain-map-ctrl-btn" onClick={() => handleZoom(1.5)} title="Zoom In"><ZoomIn size={18} /></button>
        <button className="brain-map-ctrl-btn" onClick={() => handleZoom(0.67)} title="Zoom Out"><ZoomOut size={18} /></button>
        <button className="brain-map-ctrl-btn" onClick={handleReset} title="Reset"><RotateCcw size={18} /></button>
      </div>

      {/* Detail Panel */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 280,
            background: '#1a1c1b',
            border: '1px solid #434936',
            borderRadius: 12,
            padding: 16,
            zIndex: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slideIn 0.15s ease-out',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#b7f34a',
                  textTransform: 'uppercase',
                }}
              >
                {selectedNode.group}
              </span>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginTop: 2,
                  fontFamily: 'JetBrains Mono, monospace',
                  wordBreak: 'break-all',
                }}
              >
                {selectedNode.id}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#4a4460',
                cursor: 'pointer',
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>

          {/* Description */}
          {selectedNode.details && (
            <div
              style={{
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.6,
                marginBottom: 12,
              }}
            >
              {selectedNode.details}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrainMap;
