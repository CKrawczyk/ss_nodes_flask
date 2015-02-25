// useful function to see if an array contains an object
Array.prototype.contains = function(obj) {
	var i = this.length;
	while (i--) {
		if (this[i] == obj) {
			return true;
		}
	}
	return false;
};

var image_cycle = false;
$('#carousel-image').carousel({interval: false})
$('#playButton').click(function () {
    if (image_cycle) {
        image_cycle = false;
        $('#carousel-image').carousel('pause');
    } else {
        image_cycle = true;
        $('#carousel-image').data('bs.carousel').options.interval=1000;
        $('#carousel-image').carousel('cycle');
    }
});

// set up the margins and such
var W = parseInt(d3.select('#tree').style('width'));
var origin_y = -.5*parseInt(d3.select(".carousel-inner").style("height"));
d3.select("#tree").style({"margin-top":origin_y+"px","z-index":"1"});
var margin = {top: 1, right: 1, bottom: 1, left: 1},
    width = W - margin.left - margin.right,
	height = -3.5*origin_y - margin.top - margin.bottom;

// Re-draw when window size is changed
var current_search;
function resize_window(force) {
    val = parseInt(d3.select('#tree').style('width'))
    if (val!=W || force){
        W=val;
        origin_y = -.5*parseInt(d3.select(".carousel-inner").style("height"));
        width = W - margin.left - margin.right;
        height = -3.5*origin_y - margin.top - margin.bottom;
        d3.select("#tree").style({"margin-top":origin_y+"px","z-index":"1"});
        updateData(current_search);
    }
};

// wait for re-size event to be over before re-drawing
var doit;
window.onresize = function() {
    clearTimeout(doit);
    doit = setTimeout(resize_window, 100);
};

// Hook up buttons
d3.select("#help").on("click", function() {
    $('#HelpModal').modal({show:true});
});

d3.select("#random_search").on("click",function() {
    updateData('random');
});

d3.select("#search_input").on("change", function() {
	updateData(this.value);
});

d3.select("#file_upload").on("change", function() {
    var file = d3.event.target.files[0];
    if (file) {
        var reader = new FileReader();
        reader.onloadend = function(evt) {
            var dataText = evt.target.result;
            upload_me(dataText);
        };
        reader.readAsText(file);
    };
});

// what version of galaxy zoo are we working with
// set to 2 by default
var zoo = "1";
var upload = false;
var image_offset;
set_zoo();
d3.selectAll("#zoo_buttons > label").on("click", function() {
    val=d3.select(this).select("input").property("value");
    if (val=="0") {
        d3.select("#search_button_cell").attr("style","display: none;");
        d3.select("#upload_dd_cell").attr("style","display: block;");
        upload = true;
        document.getElementById("file_upload").click();
        //upload_me("/static/data/test.csv");
    }
    else if (upload || zoo!=val) {
        d3.select("#upload_dd_cell").attr("style","display: none;");
        d3.select("#search_button_cell").attr("style","display: block;");
        upload = false;
        zoo = val;
        set_zoo();
    }
})

// what color theme to use
// default light
var color_theme="light"
d3.selectAll("#color_buttons > label").on("click", function() {
    val=d3.select(this).select("input").property("value");
    if (color_theme!=val) {
        color_theme = val;
        d3.select("#css").attr("href","./static/css/"+color_theme+"_style.css");
    }
})

// funciton to handle an uploaded file
function upload_me(dataText) {
    // parse data stream
    var data = [];
    d3.csv.parse(dataText, function(row) {
        data.push(row);
    });
    var max_size = data.length
    // populate the dropdown list
    ug=d3.select("#upload_search").selectAll("option").data(data, function(d, i) { return  i+1+": "+d.value+" "+d.table; });
    ug.enter()
        .append("option")
        .attr("value", function(d, i) { return i; })
        .attr("search", function(d) { return d.value; })
        .attr("table", function(d) { return d.table; })
        .text(function(d, i) {
            idx=i+1;
            return "   "+idx+": "+d.value+" "+d.table;
        });
    ug.exit().remove();
    $('.selectpicker').selectpicker('refresh');
    // hook up 'previous' button
    d3.select("#dd_previous").on("click", function() {
        current=parseInt(d3.select("ul.dropdown-menu.selectpicker").select("li.selected").attr("data-original-index"))
        if (current>0) {
            dd_now=current-1;
            d3.select("#upload_search").property("value", dd_now)
            dd_change(d3.select("#upload_search").select('option[value="'+dd_now+'"]'));
        };
    });
    // hook up 'next' button
    d3.select("#dd_next").on("click", function() {
        current=parseInt(d3.select("ul.dropdown-menu.selectpicker").select("li.selected").attr("data-original-index"))
        if (current<max_size-1) {
            dd_now=current+1;
            d3.select("#upload_search").property("value", dd_now)
            dd_change(d3.select("#upload_search").select('option[value="'+dd_now+'"]'));
        };
    });
    // this controls changed due to clicking on the lsit
    d3.select("ul.dropdown-menu.selectpicker").selectAll('li').on("click", function() {
        current=parseInt(d3.select(this).attr("data-original-index"));
        if (current != dd_now) {
            dd_now=current;
            dd_change(d3.select("#upload_search").select('option[value="'+current+'"]'));
        }
    });
    // function to update node tree based on selected option
    function dd_change(selected_option) {
        $('.selectpicker').selectpicker('render');
        val = selected_option.attr("table").substr(2)
        if (zoo != val) {
            zoo = val;
            set_zoo(selected_option.attr("search"));
        }
        else {
            //updateData(selected_option.attr("search"));
        };
    };
    // load first option from the list
    var dd_now = 0
    dd_change(d3.select("#upload_search").select('option[value="0"]'));
};

function set_zoo(search) {
    // read in file that maps the answer_id to the 
    // image offset in workflow.png and providing a useful
    // mouse over message
    d3.json("./static/config/zoo1_offset.json", function(d){
	    image_offset = d;
	    updateData(search||'random');
    });
};

var images
// function that takes in a galaxy id and makes the node tree
function updateData(gal_id){
    // clear the page
    d3.selectAll("svg").remove();
    if (images) {
        images.remove();
    }

    // hook up call-bakcs for the slider bars and reset button
    d3.select("#slider_charge").on("input", function() { update_charge(+this.value); })
    d3.select("#slider_strength").on("input", function() { update_strength(+this.value); })
    d3.select("#slider_friction").on("input", function() { update_friction(+this.value); })

    function update_charge(new_val){
	    d3.select("#slider_charge_value").text(new_val);
	    d3.select("#slider_charge").property("value", new_val);
	    force.charge(function(n) {return -1 * new_val * 1700 * n.value});
	    force.stop();
	    force.start();
    }

    function update_strength(new_val){
	    d3.select("#slider_strength_value").text(new_val);
	    d3.select("#slider_strength").property("value", new_val);
	    force.linkStrength(new_val);
	    force.stop();
	    force.start();
    }

    function update_friction(new_val){
	    d3.select("#slider_friction_value").text(new_val);
	    d3.select("#slider_friction").property("value", new_val);
	    // use 1-new_val to make 0 frictionless instead of 1!
	    force.friction(1-new_val);
	    force.stop();
	    force.start();
    }

    // add the draw window
    var raw_svg = d3.select("#body").append("svg")
	    .attr("width", width + margin.left + margin.right)
	    .attr("height", height + margin.top + margin.bottom);
    var svg = raw_svg.append("g")
	    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // create the node tree object
    var force = d3.layout.force()
	    .size([width, height]);

    // update the sliders to default values
    update_charge(2.5);
    update_strength(1);
    update_friction(0.35);
	/*$.getJSON($SCRIPT_ROOT + '/_get_path', {
        table: "ss"+zoo,
	    argv: gal_id
	}, function(d) {
	    json_callback(d.result)
	});
    */
    d3.json("./static/data/test_lion.json", json_callback);

    // now that the basics are set up read in the json file
    var Total_value
    var current_search
    var metadata
    function json_callback(answers) {
        metadata = answers.metadata;
        current_search = answers.zoo_id;
	    // draw the image
        images = d3.select(".carousel-inner").selectAll(".item")
        images.remove();
        images = images.data(answers.image_url);
        images.enter()
            .append("div")
            .attr("class", function(d,i) { return i ? "item" : "item active"; })
            .append("img")
            .attr("src", function(d) { return d; })
            .on("click",metadata_thumbnail);

        // format the shadow-box for metadata
        function metadata_thumbnail(d) {
	        $('#meta-body').empty();
            var title = current_search;
            var metastring = JSON.stringify(metadata,null,2);
            // remove quotes
            metastring = metastring.replace(/\"([^(\")"]+)\"/g,"$1");
            //metastring = metastring.replace(/[,]+/g, "")
            $('#meta-title').html(title);
            $('#meta-body').html('<pre class="modal-data">'+metastring+'</pre>');
	        $('#myModal').modal({show:true});
        };       
        
        // update the svg size
        origin_y = -.5*parseInt(d3.select(".carousel-inner").style("height"));
        width = W - margin.left - margin.right;
        height = -3.5*origin_y - margin.top - margin.bottom;
        d3.select("#tree").style({"margin-top":origin_y+"px","z-index":"1"});
        raw_svg.attr("width", width + margin.left + margin.right)
	        .attr("height", height + margin.top + margin.bottom);
        
        // make sure reset button returns same object
        function reset_data(){
	        updateData(current_search);
        }
        d3.select("#reset_button").on("click", reset_data)
        
	    // make sure dropdown list matches this id (useful for refresh)
	    d3.select("#search_input").property("value",current_search)
	    root = answers;
	    // make sure to minpulate data *before* the update loop
	    // add a list of source and target Links to each node
	    root.nodes.forEach(function(node) {
	        node.sourceLinks = [];
	        // _sourceLinks will be used to toggle links on and off
	        node._sourceLinks = [];
	        node.targetLinks = [];
	    });
	    root.links.forEach(function(link, i) {
	        // give each link a unique id
	        link.link_id = i;
	        link.is_max = false;
	        var source = link.source,
		        target = link.target;
	        if (typeof source === "number") source = link.source = root.nodes[link.source];
	        if (typeof target === "number") target = link.target = root.nodes[link.target];
	        source.sourceLinks.push(link);
	        target.targetLinks.push(link);
	    });
	    // Get the number of votes for each node
	    root.nodes.forEach(function(node, i) { 
            node.value = i ? d3.sum(node.targetLinks, function(L) {return L.value}) : d3.sum(node.sourceLinks, function(L) {return L.value});
	    });
	    var max_nodes=[root.nodes[0]]
	    function max_path(node) {
	        if (node.sourceLinks.length>0) {
		        link_values=[]
		        node.sourceLinks.forEach(function(d) { link_values.push(d.value); });
		        idx_max = link_values.indexOf(Math.max.apply(Math, link_values));
		        node.sourceLinks[idx_max].is_max = true;
		        max_nodes.push(node.sourceLinks[idx_max].target)
		        max_path(node.sourceLinks[idx_max].target);
	        }
	    };
	    // Find the links along the max vote path
	    max_path(root.nodes[0]);
	    
	    // Normalize votes by total number
	    Total_value=root.nodes[0].value
	    root.nodes.forEach(function(node, i) {
	        node.value /= Total_value;
	        node.radius =  height * Math.sqrt(node.value) / 18;
	        node.node_id = i;
	    });     
	    // get the x position for each node
	    computeNodeBreadths(root);
	    // find how deep the tree goes and set the linkDistance to match 
	    max_level = d3.max(root.nodes, function(d) {return d.fixed_level; });
	    force.linkDistance(.9*height/(max_level + 1));
	    
	    // good starting points
	    root.nodes.forEach(function(d , i) {
	        d.y = d.fixed_y;
	        // find if smooth or spiral is voted the most
	        // and put that group on top
	        if (root.nodes[1].value > root.nodes[2].value) { 
		        j = 1;
	        } else {
		        j = -1;
	        }
	        // set the y position such that higher vote values
	        // are on top, and (to a lesser extent) the groups
	        // stay together
	        d.x = (1 - d.value + j * d.group/10) * width/2;
	    });
	    // fix the first node so it does not move
	    root.nodes[0].radius = .07 * width
	    root.nodes[0].y = 0;
	    root.nodes[0].x = width/2;
	    root.nodes[0].fixed = true;
        // run the call-back function to update positions
	    update(root.nodes, root.links);
    };
    
    // make the links long nice by using diagonal
    // swap x and y so the curve goes the propper way
    var diagonal = d3.svg.diagonal()
	    .source(function(d) { return {"x":d.source.x, "y":d.source.y}; })
	    .target(function(d) { return {"x":d.target.x, "y":d.target.y}; })
	    .projection(function(d) {return [d.x, d.y]; });

    // select the link and gnode objects
    var link = svg.selectAll(".link"),
	    gnode = svg.selectAll(".gnode");

    var first_draw = true;

    // create the update function to draw the tree
    function update(nodes_in, links_in) {
	    // Set data as node ids
	    // add the nodes and links to the tree
	    force
	        .nodes(nodes_in)
	        .links(links_in)
	        .on("tick", tick);

	    // set the data for the links (with unique ids)
	    link = link.data(links_in, function(d) { return d.link_id; });
	    
	    // add a path object to each link
	    var lenter = link.enter().insert("path", ".gnode")
            .attr("class", function(d) { return d.is_max ? "link_max" : "link"; })
	        .attr("d", diagonal)
            .style("stroke-width", function(d) { return .5 * height * Math.sqrt(d.value/Total_value) / 18; });

	    lenter.append("title")
	        .text(function(d) { return d.value; })
        
	    // Exit any old links
	    link.exit().remove();

	    // set the data for the nodes (with unique ids)
	    gnode = gnode.data(nodes_in, function(d) { return d.node_id; });

	    // Exit any old nodes
	    gnode.exit().remove();
        
	    // add a group to the node to translate it
	    var genter = gnode.enter().append("g")
	        .attr("class", "gnode")
	        .call(force.drag)
	        .on("click", click);
        
	    // add a group to the node to scale it
	    // with this scaling the image (with r=50px) will have the propper radius
	    var gimage = genter.append("g")
	        .attr("transform", function(d) { return d.answer_id ? "scale(" + d.radius/50 + ")" : "scale(" + d.radius/100 + ")"; })

	    // add a clipPath for a circle to corp the node image
	    gimage.append("defs")
	        .append("clipPath")
	        .attr("id", function(d) { return "myClip" + d.node_id; })
	        .append("circle")
	        .attr("cx", 0)
	        .attr("cy", 0)
	        .attr("r", function(d) { return d.answer_id ? 45 : 100; });

	    // add a black circle in the background
	    gimage.append("circle")
	        .attr("color", "black")
	        .attr("cx", 0)
	        .attr("cy", 0)
	        .attr("r", function(d) { return d.answer_id ? 45 : 100; });

	    // add the inital image to the node
	    gimage.append("image")
	        .attr("xlink:href", function(d) { return d.answer_id ? "./static/images/workflow_ss.png" : ""})
	        .attr("x", function(d) { return d.answer_id ? -50: -100; })
	        .attr("y", function(d) { return d.answer_id ? -image_offset[d.answer_id][1]*100-50 : -100; })
	        .attr("clip-path", function(d) { return "url(#myClip" + d.node_id + ")"; })
	        .attr("width", function(d) { return d.answer_id ? 100: 200; })
	        .attr("height", function(d) { return d.answer_id ? 1100: 200; });
	    
	    // add the mouse over text
	    var mouse_over = genter.append("title")
	        .text(function(d) { return image_offset[d.answer_id][0] + ": " + Math.round(d.value*Total_value); })
        
	    // start the nodes moving
	    force.start();
	    //for (var i = 500; i > 0; --i) force.tick();
	    //force.stop();
        
	    d3.select("#weight_raw").on("change", function() { set_weight(0); })
	    d3.select("#weight_weighted").on("change", function() { set_weight(1); })
	    d3.select("#weight_bias").on("change", function() { set_weight(2); })

	    // call-back to set how the nodes will move
	    function tick(e) {
	        // make sure the force gets smaller as the simulation runs
	        var kx = 10 * e.alpha;
	        
	        root.nodes.forEach(function(d, i) {
		        // fix the x value at the depth of the node
		        // and add in the radius of the first node
		        i!=0 ? d.y = d.fixed_y + root.nodes[0].radius+50 : d.y = 0;
		        // move low prob nodes left
		        // and keep the groups together (to a lesser extent)
		        if (root.nodes[1].value > root.nodes[2].value) { 
		            j = 1;
		        } else {
		            j = -1;
		        }
		        // the amount to move the node
		        delta_x = (3 * d.value - j * .3 * d.group + .3) * kx;
		        // store the old position in case something goes wrong
		        // the collision detection can casue NaNs and I am not sure why
		        d.x_old = d.x;
		        // check to make sure the node is not outside the plot area
		        // if it is change the direction of the push
		        if ((d.x-d.radius<0 && delta_x>0) || (d.x+d.radius>height && delta_x<0)) {
		            delta_x *= -1
		        }
		        d.x -= delta_x;
	        });

	        // Also do collision detection after a few itterations
	        if (e.alpha<0.05) {
		        var q=d3.geom.quadtree(root.nodes),
		            i=0,
		            n=root.nodes.length;
		        while (++i < n) q.visit(collide(root.nodes[i]));
	        }
	        
	        // if the new position is NaN use the previous position
	        // this prevents links for disappearing
	        root.nodes.forEach( function(d) {
		        if (isNaN(d.y)) { d.y = d.y_old; }
	        });
	        
	        // Translate the node group to the new position
	        gnode.attr("transform", function(d) {
		        return 'translate(' + [d.x, d.y] + ')'; 
	        });    
	        link.attr("d",diagonal);
	    };
	    // the collision detection code
	    // found this online and I am not sure how it works
	    function collide(node) {
	        var r = node.radius,
		        nx1 = node.x - r,
		        nx2 = node.x + r,
		        ny1 = node.y - r,
		        ny2 = node.y + r;
	        return function(quad, x1, y1, x2, y2) {
		        if (quad.point && (quad.point !== node)) {
		            var x = node.x - quad.point.x,
			            y = node.y - quad.point.y,
			            l = Math.sqrt(x * x + y * y),
			            r = 0.9*(node.radius + quad.point.radius);
		            if (l < r) {
			            l = (l - r) / l * .5;
			            node.x -= x *= l;
			            //node.y -= y *= l;
			            quad.point.x += x;
			            //quad.point.y += y;
		            }
		        }
		        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
	        };
	    }
    };
    // Find the x positions for each node
    function computeNodeBreadths(root,first) {
        // Tree depth is fixed at 4 for SS
        ky =  height / 4.2;
        root.nodes.forEach(function(node) {
            node.fixed_y = node.fixed_y ? node.fixed_level : node.fixed_level+.2;
	        node.fixed_y *= ky;
            node.fixed_y -= 50;
	    });
    };

    // call-back to collapse/expand nodes
    function click(d) {
	    if (d3.event.defaultPrevented) return;
	    if (d.sourceLinks.length>0) {
	        d._sourceLinks=d.sourceLinks;
	        d.sourceLinks=[];
	    } else {
	        d.sourceLinks=d._sourceLinks
	        d._sourceLinks=[];
	    }
	    // find what nodes and links are still around
	    var current_nodes = [];
	    var current_links = [];
	    function recurse(node) {
	        if (!current_nodes.contains(node)) { current_nodes.push(node) };
	        if (node.sourceLinks.length>0) {
		        node.sourceLinks.forEach(function(link) {
		            if (!current_links.contains(link)) { current_links.push(link) };
		            recurse(link.target);
		        });
	        }
	    };
	    recurse(root.nodes[0]);
	    // update the nodes
	    update(current_nodes, current_links);
    };
};


