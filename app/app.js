//
// Global Variables
//
//var geneiobio_server = "http://localhost:3000/";
var geneiobio_server = "http://geneinfo.iobio.io/";


// Engine for gene search suggestions
var gene_engine = new Bloodhound({
  datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
  queryTokenizer: Bloodhound.tokenizers.whitespace,
  local: [],
  limit: 20
});

// the variant filter panel
var trackLegendTemplate = Handlebars.compile($('#track-legend-template').html());	
var variantCardTemplate = Handlebars.compile($('#variant-card-template').html());
var sampleDataTemplate  = Handlebars.compile($('#sample-data-template').html());


// The selected (sub-) region of the gene.  Null
// when there is not an active selection.
var regionStart = null;
var regionEnd = null;
var GENE_REGION_BUFFER = 1000;

// Transcript data and chart
var gene = '';
var loadedUrl = false;
var selectedTranscript = null;
var selectedTranscriptCodingRegions = [];
var transcriptChart =  null;
var transcriptViewMode = "single";
var transcriptMenuChart = null;
var transcriptPanelHeight = null;
var transcriptCollapse = true;

// filter card
var filterCard = new FilterCard();


// matrix card
var matrixCard = new MatrixCard();


// clicked variant
var clickedVariant = null;


// Format the start and end positions with commas
var formatRegion = d3.format(",");

// variant card
var variantCards = [];
var variantCardDefaultUrls = {
	proband: 'http://s3.amazonaws.com/iobio/variants/NA12878.autosome.PASS.vcf.gz',
	mother:  'http://s3.amazonaws.com/iobio/variants/NA12892.autosome.PASS.vcf.gz',
	father:  'http://s3.amazonaws.com/iobio/variants/NA12891.autosome.PASS.vcf.gz'
};
var variantCardDefaultBamUrls = {
	proband: 'http://s3.amazonaws.com/iobio/NA12878/NA12878.autsome.bam',
	mother:  'http://s3.amazonaws.com/iobio/NA12892/NA12892.autsome.bam',
	father:  'http://s3.amazonaws.com/iobio/NA12891/NA12891.autsome.bam'
};

// The smaller the region, the wider we can
// make the rect of each variant
var widthFactors = [
	{'regionStart':     0, 'regionEnd':    8000,  'factor': 6},
	{'regionStart':  8001, 'regionEnd':   10000,  'factor': 5},
	{'regionStart': 10001, 'regionEnd':   15000,  'factor': 4},
	{'regionStart': 15001, 'regionEnd':   20000,  'factor': 3},
	{'regionStart': 20001, 'regionEnd':   30000,  'factor': 2},
	{'regionStart': 30001, 'regionEnd': 90000000,  'factor': 1},
];


$(document).ready(function(){
	init();
});


function init() {
	var me = this;

    $.material.init();

    // Iniitalize the 'samples' data card.
    initDataCard();


    // Initialize page guide
	tl.pg.init({ 'auto_refresh': true, 'custom_open_button': '.open_page_guide'}); 
	

	// Set up the gene search widget
	loadGeneWidget();
	$('#bloodhound .typeahead').focus();


	
	// Create transcript chart
	transcriptChart = geneD3()
	    .width(1000)
	    .widthPercent("100%")
	    .heightPercent("100%")
	    .margin({top:20, right: 4, bottom: 0, left: 4})
	    .showXAxis(true)
	    .showBrush(true)
	    .trackHeight(16)
	    .cdsHeight(12)
	    .showLabel(false)
	    .on("d3brush", function(brush) {
	    	if (!brush.empty()) {
				regionStart = d3.round(brush.extent()[0]);
				regionEnd   = d3.round(brush.extent()[1]);
				if (!selectedTranscript) {
					selectedTranscript = window.gene.transcripts.length > 0 ? window.gene.transcripts[0] : null;
					cacheCodingRegions();

				}
			} else {
				regionStart = window.gene.start;
				regionEnd   = window.gene.end;
			}

			var probandVariantCard = null;
			variantCards.forEach(function(variantCard) {
		    	variantCard.onBrush(brush);
		    	if (variantCard.getRelationship() == 'proband') {
		    		probandVariantCard = variantCard;
		    	}
			});
			if (probandVariantCard) {
				probandVariantCard.fillFeatureMatrix(regionStart, regionEnd);
			}

		});	

    transcriptMenuChart = geneD3()
	    .width(600)
	    .margin({top: 5, right: 5, bottom: 5, left: 120})
	    .showXAxis(false)
	    .showBrush(false)
	    .trackHeight(12)
	    .cdsHeight(8)
	    .showLabel(true)
	    .on("d3selected", function(d) {
	    	window.selectedTranscript = d;
	    	cacheCodingRegions();

	    	showTranscripts();

			variantCards.forEach(function(variantCard) {
		    	variantCard.showBamDepth();
			});

	    });



	 // Initialize Matrix card
	 matrixCard = new MatrixCard();
	 matrixCard.init();


	 // Initialize the Filter card
	 filterCard = new FilterCard();
	 filterCard.init();


	// Initialize transcript view buttons
	initTranscriptControls();

	initDataSourceDialog();

	loadGeneFromUrl();
}


function initDataCard() {

	var listenToEvents = function(panelSelector) {
	    panelSelector.find('#datasource-name').on('change', function() {
	    	setDataSourceName(panelSelector); 
	    });

	    panelSelector.find('#bam-url-input').on('change', function() {
	    	onBamUrlEntered(panelSelector);
	    });
	    panelSelector.find('#display-bam-url-item').on('click', function() {
	    	displayBamUrlBox(panelSelector);
	    });
	    panelSelector.find('#bam-file-selector-item').on('click', function() {
	    	onBamFileButtonClicked(panelSelector);
	    });
	    panelSelector.find('#bam-file-upload').on('change', function() {
	    	onBamFilesSelected(event, panelSelector);
	    });
	     panelSelector.find('#clear-bam').on('click', function() {
	    	clearBamUrl(panelSelector);
	    });

	    panelSelector.find('#url-input').on('change', function() {
	    	onVcfUrlEntered(panelSelector);
	    });
	    panelSelector.find('#display-vcf-url-item').on('click', function() {
	    	displayUrlBox(panelSelector);
	    });
	    panelSelector.find('#clear-vcf').on('click', function() {
	    	clearUrl(panelSelector);
	    });

	    panelSelector.find('#vcf-file-selector-item').on('click', function() {
	    	onVcfFileButtonClicked(panelSelector);
	    });
	    panelSelector.find('#vcf-file-upload').on('change', function() {
	    	onVcfFilesSelected(event, panelSelector);
	    });
	}

	$('#proband-data').append(sampleDataTemplate());
	listenToEvents($('#proband-data'));
	addVariantCard();
	setDataSourceRelationship($('#proband-data'));


	$('#mother-data').append(sampleDataTemplate());
	$('#mother-data #sample-data-label').text("MOTHER");
	listenToEvents($('#mother-data'));
	addVariantCard();
	setDataSourceRelationship($('#mother-data'));

	$('#father-data').append(sampleDataTemplate());
	$('#father-data #sample-data-label').text("FATHER");
	listenToEvents($('#father-data'));
	addVariantCard();
	setDataSourceRelationship($('#father-data'));

	var dataCardSelector = $('#data-card');
	dataCardSelector.find('#expand-button').on('click', function() {
		dataCardSelector.find('.fullview').removeClass("hide");
	});
	dataCardSelector.find('#minimize-button').on('click', function() {
		dataCardSelector.find('.fullview').addClass("hide");
	});
	dataCardSelector.find('#ok-button').on('click', function() {
		dataCardSelector.find('.fullview').addClass("hide");
	});

}

function onCollapseTranscriptPanel() {
	transcriptCollapse = !transcriptCollapse;
	d3.select('#track-section').style("padding-top", transcriptCollapse ? transcriptPanelHeight + "px" : "89" + "px");
	d3.select('#transcript-dropdown-button').classed("hide", !transcriptCollapse);

}

function toggleSampleTrio(show) {
	if (show) {
		$('#mother-data').removeClass("hide");
		$('#father-data').removeClass("hide");
		$('#proband-data').css("width", "32%");
	} else {
		$('#mother-data').addClass("hide");
		$('#father-data').addClass("hide");
		$('#proband-data').css("width", "60%");
		var motherCard = null;
		var fatherCard = null;
		variantCards.forEach( function(variantCard) {
			if (variantCard.getRelationship() == 'mother') {
				motherCard = variantCard;
				clearUrl($('#mother-data'));
				clearBamUrl($('#mother-data'));
				motherCard.hide();
				removeUrl("vcf1");
				removeUrl("bam1");
			} else if (variantCard.getRelationship() == 'father') {
				fatherCard = variantCard;
				clearUrl($('#father-data'));
				clearBamUrl($('#father-data'));
				fatherCard.hide();
				removeUrl("vcf2");
				removeUrl("bam2");
			}
		});
		


	}


}


function initDataSourceDialog() {
	// listen for data sources open event
	$( "#datasource-dialog" ).on('shown.bs.modal', function (e) {
		initVariantCards();

  	});
}

function moveDataSourcesButton() {
	$('#add-datasource-button').css('display', 'none');
	$('#datasource-button').css('visibility', 'visible');
}

function loadGeneFromUrl() {
	var gene = getUrlParameter('gene');
	if (gene != undefined) {
		$('#bloodhound .typeahead.tt-input').val(gene).trigger('typeahead:selected', {"name": gene, loadFromUrl: true});
	} else {
		$('#tourWelcome').addClass("open");

	}
}

function loadUrlSources() {

	var bam  = getUrlParameter(/bam*/);
	var vcf  = getUrlParameter(/vcf*/);	
	var rel  = getUrlParameter(/rel*/);
	var dsname = getUrlParameter(/name*/);	

	loadTracksForGene(true);

	// get all bam and vcf url params in hash

	if ((bam != null && Object.keys(bam).length > 1) || (vcf != null && Object.keys(vcf).length > 1)) {
		toggleSampleTrio(true);
	} 


	if (bam != null) {
		Object.keys(bam).forEach(function(urlParameter) {
			var cardIndex = urlParameter.substring(3);
			var variantCard      = variantCards[+cardIndex];
			var panelSelectorStr = '#' + variantCard.getRelationship() +  "-data";
			var panelSelector    = $(panelSelectorStr);
			panelSelector.find('#bam-url-input').val(bam[urlParameter]);
			onBamUrlEntered(panelSelector);
		});
	}
	if (vcf != null) {
		Object.keys(vcf).forEach(function(urlParameter) {
			var cardIndex = urlParameter.substring(3);
			var variantCard      = variantCards[+cardIndex];
			var panelSelectorStr = '#' + variantCard.getRelationship() +  "-data";
			var panelSelector    = $(panelSelectorStr);
			panelSelector.find('#url-input').val(vcf[urlParameter]);
			onVcfUrlEntered(panelSelector);
		});
	}
	if (dsname != null) {
		Object.keys(dsname).forEach(function(urlParameter) {
			var cardIndex = urlParameter.substring(4);
			var variantCard      = variantCards[+cardIndex];
			var panelSelectorStr = '#' + variantCard.getRelationship() +  "-data";
			var panelSelector    = $(panelSelectorStr);
			panelSelector.find('#datasource-name').val(dsname[urlParameter]);
			setDataSourceName(panelSelector);
		});

	}

}

function selectVariantCard(cardIndex) {
	$('#datasource-dialog #card-index').val(+cardIndex);
	$('#variant-card-buttons a.selected').removeClass("selected");
	$('#variant-card-button-' + +cardIndex).addClass("selected");
	initDataSourceFields();

}

function initVariantCards() {
	if (variantCards.length == 0) {
		addVariantCard();
		$('#datasource-dialog #card-index').val(0);

	} else {
		$('#variant-card-buttons').removeClass("hide");
	}
	
	initDataSourceFields();
}

function initDataSourceFields() {
	var cardIndex = $('#datasource-dialog #card-index').val();
	var variantCard = variantCards[+cardIndex];

	$('#datasource-dialog .material-dropdown li').removeClass('disabled')
	if (cardIndex > 0) {
    	$('#datasource-dialog .material-dropdown li[value="proband"]').addClass('disabled')    	
    } else {    	
    	$('#datasource-dialog .material-dropdown li[value!="proband"]').addClass('disabled')    	
    }


	if (variantCard.getBamName().indexOf("http") == 0) {
		$('#datasource-dialog #bam-file-info').addClass("hide");
		$('#datasource-dialog #bam-url-input').removeClass("hide");
		$('#datasource-dialog #bam-url-input').val(variantCard.getBamName());
	} else {
		$('#datasource-dialog #bam-url-input').addClass("hide");
		$('#datasource-dialog #bam-file-info').removeClass("hide");
		$('#datasource-dialog #bam-file-info').val(variantCard.getBamName());
	}

	if (variantCard.getVcfName().indexOf("http") == 0) {
		$('#datasource-dialog #vcf-file-info').addClass("hide");
		$('#datasource-dialog #url-input').removeClass("hide");
		$('#datasource-dialog #url-input').val(variantCard.getVcfName());
	} else {
		$('#datasource-dialog #url-input').addClass("hide");
		$('#datasource-dialog #vcf-file-info').removeClass("hide");
		$('#datasource-dialog #vcf-file-info').val(variantCard.getVcfName());
	}	
	$('#datasource-dialog #datasource-name').val(variantCard.getName());
	var rel = variantCard.getRelationship();	
	$('.material-dropdown li[value="' + rel + '"]').click();	
}

function initTranscriptControls() {


	var transcriptCardSelector = $('#transcript-card');
	transcriptCardSelector.find('#expand-button').on('click', function() {
		transcriptCardSelector.find('.fullview').removeClass("hide");
		transcriptCardSelector.find('#gene-name').css("margin-left", "0");
	});
	transcriptCardSelector.find('#minimize-button').on('click', function() {
		transcriptCardSelector.find('.fullview').addClass("hide");
		transcriptCardSelector.find('#gene-name').css("margin-left", "190px");
	});


	$('#transcript-btn-group').data('open', false);

	$('#transcript-dropdown-button').click(function () {
        if ($('#transcript-btn-group').data('open')) {
            $('#transcript-btn-group').data('open', false);
            onCloseTranscriptMenuEvent();
        } else {
        	$('#transcript-btn-group').data('open', true);        	
        }
    });

    $(document).click(function () {
        if ($('#transcript-btn-group').data('open')) {
            $('#transcript-btn-group').data('open', false);
            onCloseTranscriptMenuEvent();
        }
    });
}

function onCloseTranscriptMenuEvent() {
	if (selectedTranscript != null) {
		if (selectedTranscript.transcript_id != transcriptMenuChart.selectedTranscript().transcript_id) {
			d3.selectAll("#gene-viz .transcript").remove();
		 	selectedTranscript = transcriptMenuChart.selectedTranscript();
		 	cacheCodingRegions();
		 	loadTracksForGene();
		 }		
	}

}

function getCanonicalTranscript() {
	var canonical;
	var maxCdsLength = 0;
	window.gene.transcripts.forEach(function(transcript) {
		var cdsLength = 0;
		if (transcript.features != null) {
			transcript.features.forEach(function(feature) {
				if (feature.feature_type == 'CDS') {
					cdsLength += Math.abs(parseInt(feature.end) - parseInt(feature.start));
				}
			})
			if (cdsLength > maxCdsLength) {
				maxCdsLength = cdsLength;
				canonical = transcript;
			}			
		}

	});

	if (canonical == null) {
		// If we didn't find the canonical (transcripts didn't have features), just
		// grab the first transcript to use as the canonical one.
		if (gene.transcripts != null && gene.transcripts.length > 0)
		canonical = gene.transcripts[0];
	}
	return canonical;
}

function cacheCodingRegions() {
	selectedTranscriptCodingRegions.length = 0;

	if (window.selectedTranscript != null && window.selectedTranscript.features != null) {
		window.selectedTranscript.features.forEach( function(feature) {
			if (feature.feature_type == 'CDS' || feature.feature_type == 'UTR') {
				selectedTranscriptCodingRegions.push({start: feature.start, end: feature.end});
			}
		});		
	}

}


function adjustGeneRegionBuffer() {
	GENE_REGION_BUFFER = +$('#gene-region-buffer-input').val();
	$('#bloodhound .typeahead.tt-input').val(gene.gene_name).trigger('typeahead:selected', {"name": gene.gene_name, loadFromUrl: false});

}


function updateUrl(paramName, value) {
	var params = {};
	// turn params into hash
	window.location.search.split('&').forEach(function(param){
		if (param != '') {
			param = param.split('?').length == 1 ? param : param.split('?')[1];
			var fields = param.split('=');
			params[fields[0]] = fields[1];
		}
	});
	params[paramName] = value;
	var search = [];
	Object.keys(params).forEach(function(key) {
		search.push(key + '=' + params[key]);
	})
	window.history.pushState({'index.html' : 'bar'},null,'?'+search.join('&'));	
}

function removeUrl(paramName) {
	var params = {};
	// turn params into hash, but leave out the specified parameter
	window.location.search.split('&').forEach(function(param){
		if (param.indexOf(paramName) == 0) {

		} else if (param != '') {
			param = param.split('?').length == 1 ? param : param.split('?')[1];
			var fields = param.split('=');
			params[fields[0]] = fields[1];
		}
	});
	var search = [];
	Object.keys(params).forEach(function(key) {
		search.push(key + '=' + params[key]);
	})
	window.history.pushState({'index.html' : 'bar'},null,'?'+search.join('&'));	
}


function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    var hits = {};
    for (var i = 0; i < sURLVariables.length; i++) 
    {    	
        var sParameterName = sURLVariables[i].split('=');        
        if (typeof sParam == 'string' || sParam instanceof String) {
	        if (sParameterName[0] == sParam) 
	        {
	            return sParameterName[1];
	        }
	    } else {
	    	var matches = sParameterName[0].match(sParam);
	    	if ( matches != undefined && matches.length > 0 ) {
	    		hits[sParameterName[0]] = sParameterName[1];
	    	}
	    }
    }
    if (Object.keys(hits).length == 0)
    	return undefined;
    else
    	return hits;
}



function loadGeneWidget() {
	// kicks off the loading/processing of `local` and `prefetch`
	gene_engine.initialize();
	
	 	
	var typeahead = $('#bloodhound .typeahead').typeahead({
	  hint: true,
	  highlight: true,
	  minLength: 1
	},
	{
	  name: 'name',
	  displayKey: 'name',
	  templates: {
	    empty: [
	      '<div class="empty-message">',
	      'no genes match the current query',
	      '</div>'
	    ].join('\n'),
	    suggestion: Handlebars.compile('<p><strong>{{name}}</strong></p>')
	  },
	  // `ttAdapter` wraps the suggestion engine in an adapter that
	  // is compatible with the typeahead jQuery plugin
	  source: gene_engine.ttAdapter()
	});
	
	typeahead.on('typeahead:selected',function(evt,data){	

		// Ignore second event triggered by loading gene widget from url parameter
		if (data.loadFromUrl && loadedUrl) {
			return;
		} else if (data.loadFromUrl) {
			loadedUrl = true;
		}
		
		if (data.name.indexOf(':') != -1) var searchType = 'region';
		else var searchType = 'gene';
		var url = geneiobio_server + 'api/' + searchType + '/' + data.name;

		
		$.ajax({
		    url: url,
		    jsonp: "callback",
		    type: "GET",
		    dataType: "jsonp",
		    success: function( response ) {

		    	// We have successfully return the gene model data.
		    	// Load all of the tracks for the gene's region.
		    	window.gene = response[0];		    
		    	// set all searches to correct gene	
		    	$('.typeahead.tt-input').val(window.gene.gene_name);
		    	moveDataSourcesButton();
		    	window.selectedTranscript = null;

		    	

		    	if (data.loadFromUrl) {
		    		var bam  = getUrlParameter(/bam*/);
					var vcf  = getUrlParameter(/vcf*/);	

					if (bam == null && vcf == null) {
						$('#tourWelcome').addClass("open");
					}

		    		// Autoload data specified in url
					loadUrlSources();						
		    	} else {
	
					$('#tourWelcome').removeClass("open");
					
			    	// Set all of the variant cards as "dirty"
			    	variantCards.forEach(function(variantCard) {
			    		variantCard.setDirty();
			    	});
			    	loadTracksForGene();
			    	// add gene to url params
			    	updateUrl('gene', window.gene.gene_name);
			    	if(data.callback != undefined) data.callback();

					//tl.pg.refreshVisibleSteps();
		    	}
		    	

	       	},
		    error: function( xhr, status, errorThrown ) {
		        
		        console.log( "Error: " + errorThrown );
		        console.log( "Status: " + status );
		        console.dir( xhr );
		    },
		    complete: function( xhr, status ) {
		    }
		});
	});	

	// check if gene_list is stored locally	
	var gene_list = localStorage.getItem("gene_list");
	if ( gene_list === null ) {
		// fetch gene list from server			
		$.ajax({url: 'gene_names.json'}).done(function(data, status, res) {
			gene_engine.add($.map(data, function(gene) { return { name: gene }; }));
			localStorage.setItem('gene_list', JSON.stringify(data));
		})
	} else {
		// grab gene list from localStorage			
		gene_engine.add(
			$.map(JSON.parse(gene_list), function(gene) { return { name: gene }; })
		);
	}	


}

/* 
* A gene has been selected.  Load all of the tracks for the gene's region.
*/
function loadTracksForGene(bypassVariantCards) {

	regionStart = null;
	regionEnd = null;

	$("#region-flag").addClass("hide");

	$('#data-card').removeClass("hide");
	$('#transcript-card').removeClass("hide");

    $('#gene-track').removeClass("hide");
    $('#view-finder-track').removeClass("hide");
	//$('#datasource-button').css("visibility", "visible");
	$('#transcript-btn-group').removeClass("hide");

	d3.select("#region-chart .x.axis .tick text").style("text-anchor", "start");
	var h = d3.select("#nav-section").node().offsetHeight;
	d3.select('#track-section').style("padding-top", h + "px");


	d3.select('#impact-scheme').classed("current", true);
	d3.select('#effect-scheme' ).classed("current", false);
	d3.selectAll(".impact").classed("nocolor", false);
	d3.selectAll(".effectCategory").classed("nocolor", true);
	
	gene.regionStart = formatRegion(window.gene.start);
	gene.regionEnd   = formatRegion(window.gene.end);

    $('#gene-name').text(window.gene.gene_name);   
    $('#gene-region-info').text(window.gene.chr + ' ' + window.gene.regionStart + "-" + window.gene.regionEnd);

    // Open up gene region to include upstream and downstream region;
	window.gene.start = window.gene.start < GENE_REGION_BUFFER ? 0 : window.gene.start - GENE_REGION_BUFFER;
	// TODO: Don't go past length of reference
	window.gene.end   = window.gene.end + GENE_REGION_BUFFER;
		    	


   	// This will be the view finder, allowing the user to select
	// a subregion of the gene to zoom in on the tracks.
	// ??????  TODO:  Need to figure out the cannonical transcript.	
	var transcript = [];
	if (window.gene.transcripts && window.gene.transcripts.length > 0 ) {
		transcript = getCanonicalTranscript();
	}


	// Load the read coverage and variant charts.  If a bam hasn't been
	// loaded, the read coverage chart and called variant charts are
	// not rendered.  If the vcf file hasn't been loaded, the vcf variant
	// chart is not rendered.
	showTranscripts();
	
	// This will recursively (a sequentially) call 
	// loadTracksForGenes on each variant card.
	// When done, we will fill the feature matrix for
	// the proband variant card.
	//var index = 0;
	//loadTracksForGeneNextVariantCard(variantCards, index);

	if (bypassVariantCards == null || !bypassVariantCards) {
	 	variantCards.forEach(function(variantCard) {
			variantCard.loadTracksForGene(filterCard.classifyByImpact,  function() {
					promiseFullTrio();
			});
		});
	}
	

	transcriptPanelHeight = d3.select("#nav-section").node().offsetHeight;
	
}


function loadTracksForGeneNextVariantCard(variantCards, index) {
	if (index < variantCards.length) {
		var variantCard = variantCards[index];

		variantCard.loadTracksForGene(filterCard.classifyByImpact, function() {
			index++;
			loadTracksForGeneNextVariantCard(variantCards, index);
		})
	} else {
		// Now that we have loaded all of the "viewable" cards,
		// figure out inheritance
		var probandVariantCard = null;
		variantCards.forEach( function (variantCard) {
			if (variantCard.getRelationship() == 'proband') {
				probandVariantCard = variantCard;
			}
		});
		if (probandVariantCard && probandVariantCard.isLoaded()) {
			probandVariantCard.showFeatureMatrix();
		}
	}
}


function showTranscripts(regionStart, regionEnd) {

	var transcripts = null;


	if (regionStart && regionEnd) {
		transcriptChart.regionStart(regionStart);
		transcriptChart.regionEnd(regionEnd);
		// ???????  TODO:
		// Need change the regionstart and region end of transcripts
		// to stay within selected region.  
		transcripts = window.gene.transcripts.filter(function(d) {
			if (d.end < regionStart && d.start > regionEnd ) {
				return false;
			} else {				
				return true;
			}
		});

	} else {
		transcriptChart.regionStart(+window.gene.start);
		transcriptChart.regionEnd(+window.gene.end);
		transcripts = window.gene.transcripts;

		// TODO:  Need a way of selecting the transcript that you want to
		// use when determining the variant's effect and impact (snpEff annotation)
		// For now, let's just grab the first one in the list.
		if (!selectedTranscript) {
			selectedTranscript = getCanonicalTranscript();
			cacheCodingRegions();

		}
	}


	// Show the gene transcripts.
    // Compress the tracks if we have more than 10 transcripts
    if (transcripts.length > 10) {
    	transcriptChart.trackHeight(10);
    	transcriptChart.cdsHeight(8);
    } else {
    	transcriptChart.trackHeight(16);
    	transcriptChart.cdsHeight(12);
    }

    if (transcriptViewMode == "single") {
    	transcripts = [selectedTranscript];
    	var cache = $('#transcript-dropdown-button').children();
   		$('#transcript-dropdown-button').text(selectedTranscript.transcript_id).append(cache);
   		getTranscriptSelector(selectedTranscript).attr("class", "transcript selected");
	} 


	selection = d3.select("#gene-viz").datum(transcripts);    
	transcriptChart(selection);

	selection = d3.select("#transcript-menu-item").datum(window.gene.transcripts);
	transcriptMenuChart(selection);

	d3.select("#gene-viz .x.axis .tick text").style("text-anchor", "start");

	// update track starting position after transcripts have been rendered
	var h = d3.select("#nav-section").node().offsetHeight;
	d3.select('#track-section').style("padding-top", h + "px");
}

function getTranscriptSelector(selectedTranscript) {
	var selector = '#transcript-menu-item #transcript_' + selectedTranscript.transcript_id.split(".").join("_");
	return $(selector);
}

function addVariantCard() {

	var variantCard = new VariantCard();
	variantCards.push(variantCard);	

	var cardIndex = variantCards.length - 1;
	var defaultName = " ";
	variantCard.setName(defaultName);

	// TODO:  Should really test to make sure that first card is proband, but
	var cardSelectorString = null;
	if (cardIndex == 0) {
		$('#proband-variant-card').append(variantCardTemplate());  
		cardSelectorString = "#proband-variant-card .variant-card:eq(" + cardIndex + ")" ;
	} else {
		$('#other-variant-cards').append(variantCardTemplate());  
		cardSelectorString = "#other-variant-cards .variant-card:eq(" + (+cardIndex - 1) + ")" ;
	}

	var d3CardSelector = d3.selectAll(".variant-card").filter(function(d, i) { return i == +cardIndex; });


	variantCard.init($(cardSelectorString), d3CardSelector, cardIndex);


	$('#datasource-dialog #card-index').val(cardIndex);


	$('#datasource-dialog #datasource-name').val(defaultName);
	$('#datasource-dialog #bam-file-info').addClass("hide");
	$('#datasource-dialog #bam-url-input').addClass("hide");
	$('#datasource-dialog #vcf-file-info').addClass("hide");
	$('#datasource-dialog #url-input').addClass("hide");
	$('#datasource-dialog #bam-file-info').val("");
	$('#datasource-dialog #bam-url-input').val("");
	$('#datasource-dialog #vcf-file-info').val("");
	$('#datasource-dialog #url-input').val("");

	$('#datasource-dialog #bam-file-upload').val("");
	$('#datasource-dialog #vcf-file-upload').val("");


    $('#variant-card-buttons')
         .append($("<a></a>")
         .attr("id", "variant-card-button-" + cardIndex)
         .attr("href", "javascript:void(0)")
         .attr("onclick", 'selectVariantCard("'+ cardIndex + '")')
         .attr("class", "btn btn-default")
         .text(defaultName));

    if (cardIndex > 0) {
    	$('#datasource-dialog .material-dropdown li').removeClass('disabled')
    	$('#datasource-dialog .material-dropdown li[value="proband"]').addClass('disabled')
    	$('.material-dropdown li[value="none"]').click();	
    } else {
    	$('.material-dropdown li[value="proband"]').click();	
    }
}


function onBamFileButtonClicked(panelSelector) {	
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	panelSelector.find('#bam-file-info').removeClass("hide");

	panelSelector.find('#bam-url-input').addClass('hide');
	panelSelector.find('#bam-url-input').val('');
}

function onBamFilesSelected(event, panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	var cardIndex = panelSelector.find('#card-index').val();

	var variantCard = variantCards[+cardIndex];

	setDataSourceName(panelSelector);
	setDataSourceRelationship(panelSelector);

	variantCard.onBamFilesSelected(event, function(bamFileName) {
		panelSelector.find('#bam-file-info').removeClass('hide');
		panelSelector.find('#bam-file-info').val(bamFileName);
		variantCard.loadBamDataSource(variantCard.getName());
	});
	variantCard.setDirty();


}


function onBamUrlEntered(panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	var bamUrlInput = panelSelector.find('#bam-url-input');
	bamUrlInput.removeClass("hide");

	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	setDataSourceName(panelSelector);
	setDataSourceRelationship(panelSelector);

	variantCard.onBamUrlEntered(bamUrlInput.val());	
	variantCard.loadBamDataSource(variantCard.getName());
	variantCard.setDirty();

	updateUrl('bam' + cardIndex, bamUrlInput.val());

}

function displayBamUrlBox(panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	panelSelector.find('#bam-file-info').addClass('hide');
    panelSelector.find('#bam-file-info').val('');
    panelSelector.find('#bam-url-input').removeClass("hide");
    panelSelector.find("#bam-url-input").focus();

    var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	if (panelSelector.find('#bam-url-input').val() == '') {
	    panelSelector.find('#bam-url-input').val(variantCardDefaultBamUrls[variantCard.getRelationship()]);
	}
    onBamUrlEntered(panelSelector);
	

}

function clearBamUrl(panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}

	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];


	displayBamUrlBox(panelSelector);
	panelSelector.find("#bam-url-input").val("");
	onBamUrlEntered(panelSelector);

}

function displayUrlBox(panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}

	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	if (panelSelector.find('#url-input').val() == '') {
	    panelSelector.find('#url-input').val(variantCardDefaultUrls[variantCard.getRelationship()]);
	}
	panelSelector.find("#url-input").removeClass('hide');
    panelSelector.find("#url-input").focus();
    panelSelector.find('#vcf-file-info').addClass('hide');
    panelSelector.find('#vcf-file-info').val('');
    onVcfUrlEntered(panelSelector);
}

function clearUrl(panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}

	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];


	displayUrlBox(panelSelector);
	panelSelector.find("#url-input").val("");
	onVcfUrlEntered(panelSelector);


}
function onVcfFileButtonClicked(panelSelector) {	
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	panelSelector.find('#vcf-file-info').removeClass("hide");

	panelSelector.find('#url-input').addClass('hide');
	panelSelector.find('#url-input').val('');
}

function onVcfFilesSelected(event, panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	setDataSourceName(panelSelector);
	setDataSourceRelationship(panelSelector);

	variantCard.onVcfFilesSelected(event, function(vcfFileName) {
		panelSelector.find('#vcf-file-info').removeClass('hide');
		panelSelector.find('#vcf-file-info').val(vcfFileName);
		variantCard.loadVcfDataSource(variantCard.getName(), function() {
			promiseFullTrio();

		});
	});
	variantCard.setDirty();
}

function promiseFullTrio() {
	var loaded = {};
	variantCards.forEach(function(vc) {
		if (vc.isLoaded()) {
			loaded[vc.getRelationship()] = vc;
		}
	});
	if (loaded.proband != null & loaded.mother  != null && loaded.father != null) {
		loaded.proband.showFeatureMatrix(true);
	}

}

function onVcfUrlEntered(panelSelector) {
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	setDataSourceName(panelSelector);
	setDataSourceRelationship(panelSelector);


	var vcfUrl = panelSelector.find('#url-input').val();

	variantCard.onVcfUrlEntered(vcfUrl);
	updateUrl('vcf'+cardIndex, vcfUrl);
	variantCard.loadVcfDataSource(variantCard.getName(),  function() {
		promiseFullTrio();
	});
	variantCard.setDirty();
}


function setDataSourceName(panelSelector) {	
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}
	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	var dsName = panelSelector.find('#datasource-name').val();
	variantCard.setName(dsName);
	variantCard.showDataSources(dsName);
	
	//	$('#variant-card-button-' + cardIndex ).text(dsName);
	updateUrl('name' + cardIndex, dsName);

}

function setDataSourceRelationship(panelSelector) {		
	if (!panelSelector) {
		panelSelector = $('#datasource-dialog');
	}

	var cardIndex = panelSelector.find('#card-index').val();
	var variantCard = variantCards[+cardIndex];

	var dsRelationship = panelSelector.find('#datasource-relationship').val();
	variantCard.setRelationship(dsRelationship);	
	updateUrl('rel' + cardIndex, dsRelationship);
}

function loadNewDataSources() {
	// check if gene is selected
	if(window.gene && window.gene != "") {
		$('#datasource-dialog').modal('hide');
		loadDataSources();	
		// set search box back to no border
		$('#datasource-dialog .twitter-typeahead').css('border', 'none');		
	}
	else {
		$('#datasource-dialog .twitter-typeahead').css('border', '1px solid red');
	}
	
}

function loadDataSources() {	
	// hide add data button
	$('#add-datasource-container').css('display', 'none');

	var index = 0;
	loadNextVariantCard(variantCards, index);

}

function loadNextVariantCard(variantCards, index) {
	if (index < variantCards.length) {
		var variantCard = variantCards[index];

		variantCard.loadDataSources(variantCard.getName(), function() {
			index++;
			loadNextVariantCard(variantCards, index);
		})
	} else {
		// Now that we have loaded all of the "viewable" cards,
		// figure out inheritance
		var probandVariantCard = null;
		variantCards.forEach( function (variantCard) {
			if (variantCard.getRelationship() == 'proband') {
				probandVariantCard = variantCard;
			}
		});
		if (probandVariantCard) {
			probandVariantCard.showFeatureMatrix();
		}
	}
}

function showCircleRelatedVariants(variant, sourceVariantCard) {
	variantCards.forEach( function(variantCard) {
		if (variantCard.isViewable()) {
			variantCard.hideVariantCircle();
			variantCard.showVariantCircle(variant, sourceVariantCard);
			variantCard.showCoverageCircle(variant);
		}
	});

}

function hideCircleRelatedVariants() {
	variantCards.forEach( function(variantCard) {
		if (variantCard.isViewable()) {
			variantCard.hideVariantCircle();
			variantCard.hideCoverageCircle();
		}
	});
}




function orderVariantsByPosition(a, b) {
	var refAltA = a.type.toLowerCase() + " " + a.ref + "->" + a.alt;
	var refAltB = b.type.toLowerCase() + " " + b.ref + "->" + b.alt;

	if (a.start == b.start) {
		if (refAltA == refAltB) {
			return 0;
		} else if ( refAltA < refAltB ) {
			return -1;
		} else {
			return 1;
		}
	} else if (a.start < b.start) {
		return -1;
	} else {
		return 1;
	}
}


function compareVariantsToPedigree(theVcfData, callback) {
	theVcfData.features.forEach(function(variant) {
		variant.compareMother = null;
		variant.compareFather = null;
		variant.inheritance = 'none';
	});
	var motherVariantCard = null;
	var fatherVariantCard = null;
	variantCards.forEach( function(variantCard) {
		if (variantCard.getRelationship() == 'mother') {
			motherVariantCard= variantCard;
		} else if (variantCard.getRelationship() == 'father') {
			fatherVariantCard = variantCard;
		}
	});
	if (motherVariantCard == null || fatherVariantCard == null) {
		callback(theVcfData);

	} else {
	
		theVcfData.features = theVcfData.features.sort(orderVariantsByPosition);

	    motherVariantCard.compareVcfRecords(theVcfData,
	    	// This is the function that is called after all the proband variants have been compared
	    	// to the mother variant set.  In this case, we now move on to comparing the
	    	// father variant set to the proband variant set.
	    	function() {
		        fatherVariantCard.compareVcfRecords(theVcfData, 
		        	// This is the function that is called after the proband variants have been compared
		        	// to the father variant set. 
		        	function(){

		        		// Fill in the af level on each variant.  Use the af in the vcf if
		        		// present, otherwise, use the 1000g af if present, otherwise use
		        		// the ExAC af.
		        		theVcfData.features.forEach(function(variant) {
		        			if (variant.zygosity != null && variant.zygosity.toLowerCase() == 'hom' 
		        				&& variant.motherZygosity != null && variant.motherZygosity.toLowerCase() == 'het' 
		        				&& variant.fatherZygosity != null && variant.fatherZygosity.toLowerCase() == 'het') {
		        				variant.inheritance = 'recessive';
		        			} else if (variant.compareMother == 'unique1' && variant.compareFather == 'unique1') {
		        				variant.inheritance = 'denovo';
		        			}
						});
		        		$("#matrix-panel .loader-label").text("Ranking variants");

		        		filterCard.enableInheritanceFilters(theVcfData);
  						

			        	callback(theVcfData);
			        }, 
			        // This is the attribute on variant a (proband) and variant b (father)
			        // that will store whether the variant is unique or matches.
			        'compareFather',
			        // This is the attribute on the proband variant that will store the
			        // father's zygosity in the case where the variant match
			        'fatherZygosity',
			    	// This is the callback function called every time we find the same variant
			    	// in both sets. Here we take the father variant's zygosity and store it in the
			    	// proband's variant for further sorting/display in the feature matrix.
			        function(variantA, variantB) {
			        	variantA.fatherZygosity = variantB.zygosity != null ? variantB.zygosity : '';
			        });
	    	}, 
	    	// This is the attribute on variant a (proband) and variant b (mother)
			// that will store whether the variant is unique or matches.
	    	'compareMother',
	    	// This is the attribute on the proband variant that will store the
			// mother's zygosity in the case where the variant match
			'motherZygosity',
	    	// This is the callback function called every time we find the same variant
	    	// in both sets. Here we take the mother variant's af and store it in the
	    	// proband's variant for further sorting/display in the feature matrix.
	    	function(variantA, variantB) {
	    		variantA.motherZygosity = variantB.zygosity != null ? variantB.zygosity : '';

	    	});
	}

}




function variantTooltipHTML(variant, rowIndex) {

	var effectDisplay = "";
	for (var key in variant.effect) {
	if (effectDisplay.length > 0) {
	  	effectDisplay += ", ";
	}
		// Strip out "_" from effect
		var tokens = key.split("_");
		effectDisplay += tokens.join(" ");
	}    
	var impactDisplay = "";
	for (var key in variant.impact) {
		if (impactDisplay.length > 0) {
		  	impactDisplay += ", ";
		}
		impactDisplay += key;
	} 
	var clinSigDisplay = "";
	for (var key in variant.clinVarClinicalSignificance) {
		if (key != 'none') {
			if (clinSigDisplay.length > 0) {
			  	clinSigDisplay += ", ";
			}
			clinSigDisplay += key;
		}
	}
	var phenotypeDisplay = "";
	for (var key in variant.clinVarPhenotype) {
		if (phenotypeDisplay.length > 0) {
		  	phenotypeDisplay += ", ";
		}
		phenotypeDisplay += key;
	}      
	var coord = variant.start + (variant.end > variant.start+1 ?  ' - ' + variant.end : "");
	var refalt = variant.ref + "->" + variant.alt;

	var clinvarUrl = "";
	if (variant.clinVarUid != null && variant.clinVarUid != '') {
		var url = 'http://www.ncbi.nlm.nih.gov/clinvar/variation/' + variant.clinVarUid;
		clinvarUrl = '<a href="' + url + '" target="_new"' + '>' + variant.clinVarUid + '</a>';
	}
	
	return (
		  tooltipRowNoLabel(variant.type + ' ' + coord + ' ' + refalt)
		+ tooltipRow('Impact', impactDisplay)
		+ tooltipRow('Effect', effectDisplay)
		+ tooltipRow('ClinVar', clinSigDisplay)
		+ tooltipRow('Phenotype', phenotypeDisplay)
		+ tooltipRow('Qual', variant.qual) 
		+ tooltipRow('Filter', variant.filter) 
		+ tooltipRow('Depth (VCF)', variant.genotypeDepth) 
		+ tooltipRow('Genotype', variant.genotypeForAlt)
		+ tooltipRow('Zygosity', variant.zygosity == "gt_unknown" ? "(No genotype)" : variant.zygosity)
		+ tooltipRow('GMAF', variant.gMaf)
		+ tooltipRow('Inheritance',  variant.inheritance)
		+ tooltipRow('AF ExAC', variant.afExAC == -100 ? "n/a" : variant.afExAC, true)
		+ tooltipRow('AF 1000G', variant.af1000G, true)
		+ tooltipRow('ClinVar uid', clinvarUrl )
		// + tooltipRow('ClinVar #', variant.clinVarAccession)
		// + tooltipRow('NCBI ID', variant.ncbiId)
		// + tooltipRow('HGVS g', variant.hgvsG)
	);                    

}

function tooltipRow(label, value, alwaysShow) {
	if (alwaysShow || (value && value != '')) {
		return '<div class="row">'
		      + '<div class="col-md-4">' + label + '</div>'
		      + '<div class="col-md-8">' + value + '</div>'
		      + '</div>';
	} else {
		return "";
	}
}
function tooltipRowNoLabel(value) {
	if (value && value != '') {
		return '<div class="row" style="text-align:center">'
		      + '<div class="col-md-12">' + value + '</div>'
		      + '</div>';
	} else {
		return "";
	}
}

function filterVariants() {
	variantCards.forEach( function(variantCard) {
		if (variantCard.isViewable()) {
			var filteredVcfData = variantCard.filterVariants();
	  		variantCard.fillVariantChart(filteredVcfData, regionStart, regionEnd);

	  		if (variantCard.getRelationship() == 'proband') {
	  			var filteredFBData = variantCard.filterFreebayesVariants();
	  			if (filteredFBData != null) {
		  			variantCard.fillFreebayesChart(filteredFBData, regionStart, regionEnd, true);
	  			}
	  			variantCard.fillFeatureMatrix(regionStart, regionEnd);
			}
		}

	});

}



 