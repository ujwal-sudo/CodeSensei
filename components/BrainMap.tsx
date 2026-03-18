
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
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => getRadius(d) + 5));

    // Edges
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", "#1E1E35")
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
          d3.select(this).attr("stroke", "#00D4FF");
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
        .attr("stroke", (d) => highlightNodes.includes(d.id) ? "#6C63FF" : getNodeStroke(d as GraphNode))
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
    if (d.group === 'external') return '#6C63FF';
    if (d.group === 'module') return '#13131F';
    return '#0E0E1A';
  }
  function getNodeStroke(d: GraphNode): string {
    if (d.group === 'external') return '#6C63FF';
    if (d.group === 'module') return 'rgba(108,99,255,0.5)';
    return '#1E1E35';
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
      <div className={`detail-panel ${selectedNode ? 'detail-panel--open' : ''}`}>
        {selectedNode && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <span className="text-heading" style={{ fontSize: 16 }}>{selectedNode.id}</span>
              <button className="icon-btn" onClick={() => setSelectedNode(null)}><X size={18} /></button>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              {selectedNode.id}
            </div>
            <div className="card-header">
              <div className="card-accent-bar" />
              <span className="card-title">Type</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, textTransform: 'capitalize' }}>{selectedNode.group}</p>
            {selectedNode.details && (
              <>
                <div className="card-header" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="card-accent-bar card-accent-bar--cyan" />
                  <span className="card-title">Details</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{selectedNode.details}</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BrainMap;
