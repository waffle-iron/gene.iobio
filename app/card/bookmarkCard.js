function BookmarkCard() {
	this.bookmarkedVariants = {};
	this.bookmarkedGenes = {};
	this.selectedBookmarkKey = null;
	this.favorites = {};
	this.exportFields = [
		'chrom', 
		'start', 
		'end', 
		'ref', 
		'alt', 
		'gene', 
		'transcript', 
	    'starred',
	    'freebayesCalled',
	    'type',
		'impact',
		'highestImpact', 
		'highestImpactInfo',
		'consequence',
		'afExAC',
		'af1000G',
		'inheritance', 
		'polyphen',
		'SIFT',
		'rsId',
		'clinvarClinSig',
		'clinvarPhenotype',
		'HGVSc',
		'HGVSp',
		'regulatory',
		'qual',
		'filter',
		'zygosityProband',
		'altCountProband',
		'refCountProband',
		'depthProband',
		'bamDepthProband',
	    'zygosityMother',
		'altCountMother',
		'refCountMother',
		'depthMother',
		'bamDepthMother',
	    'zygosityFather',
		'altCountFather',
		'refCountFather',
		'depthFather',
		'bamDepthFather',
		'dbSnpUrl',
		'clinvarUrl'

	];

	this.proxyBookmarkFieldsToExport = [
		{field: 'inheritance'},

		{field: 'zygosityProband', target: 'zygosity', isProxy: true },
		{field: 'altCountProband', target: 'genotypeAltCount', isProxy: true },
		{field: 'refCountProband', target: 'genotypeRefCount', isProxy: true },
		{field: 'depthProband',    target: 'genotypeDepth', isProxy: true },
		{field: 'bamDepthProband', target: 'bamDepth', isProxy: true },

		{field: 'zygosityMother', target: 'motherZygosity', isProxy: true },
		{field: 'altCountMother', target: 'genotypeAltCountMother', isProxy: true },
		{field: 'refCountMother', target: 'genotypeRefCountMother', isProxy: true },
		{field: 'depthMother',    target: 'genotypeDepthMother', isProxy: true },
		{field: 'bamDepthMother', isProxy: true },

		{field: 'zygosityFather', target: 'fatherZygosity', isProxy: true },
		{field: 'altCountFather', target: 'genotypeAltCountFather', isProxy: true },
		{field: 'refCountFather', target: 'genotypeRefCountFather', isProxy: true },
		{field: 'depthFather',    target: 'genotypeDepthFather', isProxy: true },
		{field: 'bamDepthFather', isProxy: true }
	]
	

}

BookmarkCard.prototype.init = function() {
	var me = this;
	// Stop event propogation to get genes dropdown
	// so that clicks in text area for copy/paste
	// don't cause dropdown to close
	$('#import-bookmarks-dropdown ul li#copy-paste-li').on('click', function(event){
	    //The event won't be propagated to the document NODE and 
	    // therefore events delegated to document won't be fired
	    event.stopPropagation();
	});
	// Enter in copy/paste textarea should function as newline
	$('#import-bookmarks-dropdown ul li#copy-paste-li').keyup(function(event){

		if((event.which== 13) && ($(event.target)[0]== $("textarea#bookmarks-to-import")[0])) {
			event.stopPropagation();
		}
	});	
	// Detect when get genes dropdown opens so that
	// we can prime the textarea with the genes already
	// selected
	$('#import-bookmarks-dropdown').click(function () {
	    if($(this).hasClass('open')) {
	        // dropdown just closed
	    } else {
	    	// dropdown will open
	    	me.initImportBookmarks();
	    	setTimeout(function() {
			  $('#bookmarks-to-import').focus();
			}, 0);
	    	
	    }
	});

}

BookmarkCard.prototype.onBookmarkFileSelected = function(fileSelection) {
	var importSource = $('input[name="import-source"]:checked').val();
	var files = fileSelection.files;
	var me = this;
 	// Check for the various File API support.
      if (window.FileReader) {
      	var bookmarkFile = files[0];
		var reader = new FileReader();

		reader.readAsText(bookmarkFile);

		// Handle errors load
		reader.onload = function(event) {
			var data = event.target.result;
			if (importSource == "gene") {
				me.importBookmarksCSV(data)
			} else if (importSource == 'gemini') {
				me.importBookmarksGemini(data)
			}
			$('#dataModal').modal('hide');
		    fileSelection.value = null;
		}
		reader.onerror = function(event) {
			alert("Cannot read file. Error: " + event.target.error.name);
			console.log(event.toString())
		}

      } else {
          alert('FileReader are not supported in this browser.');
      }

}

BookmarkCard.prototype.initImportBookmarks = function() {

}

BookmarkCard.prototype.importBookmarksCSV = function(data) {
	var me = this;
	
	me.bookmarkedVariants = {};
	var recCount = 0;
	var fieldNames = [];
	var exportRecords = [];
	data.split(/[\r\n]+/g).forEach( function(rec) {
		/*
		  Validate a CSV string having single, double or un-quoted values.
			^                                   # Anchor to start of string.
			\s*                                 # Allow whitespace before value.
			(?:                                 # Group for value alternatives.
			  '[^'\\]*(?:\\[\S\s][^'\\]*)*'     # Either Single quoted string,
			| "[^"\\]*(?:\\[\S\s][^"\\]*)*"     # or Double quoted string,
			| [^,'"\s\\]*(?:\s+[^,'"\s\\]+)*    # or Non-comma, non-quote stuff.
			)                                   # End group of value alternatives.
			\s*                                 # Allow whitespace after value.
			(?:                                 # Zero or more additional values
			  ,                                 # Values separated by a comma.
			  \s*                               # Allow whitespace before value.
			  (?:                               # Group for value alternatives.
			    '[^'\\]*(?:\\[\S\s][^'\\]*)*'   # Either Single quoted string,
			  | "[^"\\]*(?:\\[\S\s][^"\\]*)*"   # or Double quoted string,
			  | [^,'"\s\\]*(?:\s+[^,'"\s\\]+)*  # or Non-comma, non-quote stuff.
			  )                                 # End group of value alternatives.
			  \s*                               # Allow whitespace after value.
			)*                                  # Zero or more additional values
			$                                   # Anchor to end of string.
		*/
		var regexp = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g
		var match = regexp.exec(rec);

		var exportRec = {};
		var idx = 0;
		while (match != null) {
		  // matched text: match[0]
		  // match start: match.index
		  // capturing group n: match[n]
		  if (recCount == 0) {
		  	fieldNames.push(match[2]);
		  } else {
		  	exportRec[fieldNames[idx]] = match[2];
		  }
		  match = regexp.exec(rec);
		  idx++;
		}
		if (recCount > 0 && Object.keys(exportRec).length > 0) {
			exportRecords.push(exportRec);
		}
		recCount++;
	});

	exportRecords.forEach( function(er) {
			var key = me.getBookmarkKey(er.gene, er.transcript, er.chrom, er.start, er.ref, er.alt);
			if (me.bookmarkedVariants[key] == null) {
				er.isProxy = true;
				er.importSource = "gene"
				er.importFormat = "csv";
				me.bookmarkedVariants[key] = er;
				if (er.starred == 'Y') {
					me.favorites[key] = true;
				}
			}
	});
	me.showImportedBookmarks();


}

BookmarkCard.prototype.importBookmarksGemini = function(data) {
	var me = this;

	
	me.bookmarkedVariants = {};
	var recs = data.split(/[\r\n]+/g);
	recs.forEach( function(rec) {
		var fields = rec.split(/\s+/);

		if (fields.length >= 5) {
			var chrom        = fields[0];
			var start        = +fields[1];
			var end          = +fields[2];
			var ref          = fields[3];
			var alt          = fields[4];
			var geneName     = fields[5];
			var transcriptId = null;
			if (fields.length > 5) {
				transcriptId = fields[6];
			}

			// Skip the first line if it contains column names
			if (chrom == "chrom") {

			} else {
				var key = me.getBookmarkKey(geneName, transcriptId, chrom, start, ref, alt);
				if (me.bookmarkedVariants[key] == null) {
					me.bookmarkedVariants[key] = {isProxy: true, importSource: 'gemini', importFormat: "tsv", gene: geneName, transcriptId: transcriptId, chrom: chrom, start: +start, end: +end, ref: ref, alt: alt};
				}
			}

			

		}
	});

	me.showImportedBookmarks();

}

BookmarkCard.prototype.showImportedBookmarks = function() {
	var me = this;
	showSidebar("Bookmarks");
	

	// Get the phenotypes for each of the bookmarked genes
	var promises = []
	for (var geneName in me.bookmarkedGenes) {
		var promise = genesCard.promiseGetGenePhenotypes(geneName).then(function() {
			Promise.all(promises).then(function() {
				me.refreshBookmarkList();
			});
		});
		promises.push(promise);
	}	

	// Add the bookmarked genes to the gene buttons
	genesCard.refreshBookmarkedGenes(me.bookmarkedGenes);

	$('#import-bookmarks-dropdown .btn-group').removeClass('open');		
}

BookmarkCard.prototype.reviseCoord = function(bookmarkEntry, gene) {
	var me = this;
	var revisedBookmarkEntry = $().extend({}, bookmarkEntry);

	if (bookmarkEntry.importSource == 'gemini') {
		revisedBookmarkEntry.start++;
	}

	// TODO: If gene is reverse strand, change ref alt to compliment
	if (gene.strand == "-") {
		//revisedBookmarkEntry.alt = me.reverseBases(bookmarkEntry.alt);
		//revisedBookmarkEntry.ref = me.reverseBases(bookmarkEntry.ref);
	}

	// TODO:  Normalize since variants are normalized

	return revisedBookmarkEntry;
}

BookmarkCard.prototype.reverseBases = function(bases) {
	var reversedBases = "";
	for (var i = 0; i < bases.length; i++) {
    	var base = bases.charAt(i);
    	var rb = null;
    	if (base == 'A') {
    		rb = 'T';
    	} else if (base == 'T') {
    		rb = 'A';
    	} else if (base == 'C') {
    		rb = 'G';
    	} else if (base == 'G') {
    		rb = 'C';
    	}
    	reversedBases += rb;
    }
    return reversedBases;
}

BookmarkCard.prototype.bookmarkVariant = function(variant) {
	var me = this;
	if (variant) {		
		var key = this.getBookmarkKey(gene.gene_name, selectedTranscript.transcript_id, gene.chr, variant.start, variant.ref, variant.alt);
		if (this.bookmarkedVariants[key] == null) {
			this.bookmarkedVariants[key] = variant;
			//getProbandVariantCard().unpin();
			getProbandVariantCard().addBookmarkFlag(variant, me.compressKey(key), false);
			matrixCard.addBookmarkFlag(variant);
			variant.isBookmark = 'Y';

			var keys = me.bookmarkedGenes[gene.gene_name];
	    	if (keys == null) {
	    		keys = [];
	    	}
	    	keys.push(key);
	    	me.bookmarkedGenes[gene.gene_name] = keys;
		}
		genesCard.setBookmarkBadge(gene.gene_name);
	}
}

BookmarkCard.prototype.removeBookmark = function(key, variant) {
	var me = this;
	variant.isBookmark = 'N';
	getProbandVariantCard().removeBookmarkFlag(variant, this.compressKey(key));
	matrixCard.removeBookmarkFlag(variant);


	var geneName = me.parseKey(key).gene;
	delete this.bookmarkedVariants[key];

	var bookmarkKeys = me.bookmarkedGenes[geneName];
	var index = bookmarkKeys.indexOf(key);
	if (index >= 0) {
		bookmarkKeys.splice(index, 1);
	}
	if (bookmarkKeys.length == 0) {
		delete this.bookmarkedGenes[geneName];
		genesCard.setBookmarkBadge(geneName);
	}

	this.refreshBookmarkList();


}

BookmarkCard.prototype.getBookmarkKey = function(geneName, transcriptId, chrom, start, ref, alt) {
	return geneName + " " 
	     + transcriptId + " : " 
         + chrom  + " " 
         + start  + " " 
         + ref + "->" 
         + alt;         
}

BookmarkCard.prototype.parseKey = function(key) {
	var bm = {};

	var parts = key.split(": ");
	bm.gene         = parts[0].split(" ")[0];
	bm.transcriptId = parts[0].split(" ")[1];
	bm.chr          = parts[1].split(" ")[0];
	bm.start        = parts[1].split(" ")[1];
	var refAndAlt   = parts[1].split(" ")[2];	
	bm.ref          = refAndAlt.split("->")[0];
	bm.alt          = refAndAlt.split("->")[1];

	return bm;
}

BookmarkCard.prototype.compressKey = function(bookmarkKey) {
	bookmarkKey = bookmarkKey.split(": ").join("-");
	bookmarkKey = bookmarkKey.split("->").join("-");
	bookmarkKey = bookmarkKey.split(" ").join("-");
	bookmarkKey = bookmarkKey.split(".").join("-");
	return bookmarkKey;
}

BookmarkCard.prototype.determineVariantBookmarks = function(vcfData, geneObject) {
	var me = this;
	if (vcfData && vcfData.features) {
		var bookmarkKeys = me.bookmarkedGenes[geneObject.gene_name];
		if (bookmarkKeys && bookmarkKeys.length > 0) {
			bookmarkKeys.forEach( function(bookmarkKey) {
				var bookmarkEntry = me.bookmarkedVariants[bookmarkKey];
				var theBookmarkEntry = bookmarkEntry.hasOwnProperty("isProxy") ? me.reviseCoord(bookmarkEntry, geneObject) : bookmarkEntry;
				var variant = getProbandVariantCard().getBookmarkedVariant(theBookmarkEntry, vcfData);
				if (variant) {
					variant.isBookmark = 'Y';
					me.bookmarkedVariants[bookmarkKey] = variant;
				}
			});
		}
		//me.refreshBookmarkList();
	}
}



/*
 This method is called when a gene is selected and the variants are shown.
*/
BookmarkCard.prototype.flagBookmarks = function(variantCard, geneObject) {
	var me = this;
	var bookmarkKeys = me.bookmarkedGenes[geneObject.gene_name];
	if (bookmarkKeys) {
		me._flagBookmarksForGene(variantCard, geneObject, bookmarkKeys, true);
	}

}

BookmarkCard.prototype._flagBookmark = function(variantCard, geneObject, variant, bookmarkKey) {
	var me = this;
	
	// Flag the bookmarked variant
	if (variant) {
		variant.isBookmark = 'Y';
		variantCard.addBookmarkFlag(variant, me.compressKey(bookmarkKey), true);

		matrixCard.highlightVariant(variant, true);

		// Now that we have resolved the bookmark entries for a gene, refresh the
		// bookmark list so that the glyphs show for each resolved bookmark.
		me.refreshBookmarkList();

	} else {

	}
}

BookmarkCard.prototype._flagBookmarksForGene = function(variantCard, geneObject, bookmarkKeys, displayVariantFlag) {
	var me = this;
	
	// Now flag all other bookmarked variants for a gene
	bookmarkKeys.forEach( function(key) {		
		var theBookmarkEntry = me.bookmarkedVariants[key];
		var theVariant = me.resolveBookmarkedVariant(key, theBookmarkEntry, geneObject);
		if (theVariant) {
			theVariant.isBookmark = 'Y';
			if (displayVariantFlag) {
				variantCard.addBookmarkFlag(theVariant, me.compressKey(key), false);		
			}

		} 
	});

	// Now that we have resolved the bookmark entries for a gene, refresh the
	// bookmark list so that the glyphs show for each resolved bookmark.
	//me.refreshBookmarkList();

	
}

BookmarkCard.prototype.resolveBookmarkedVariant = function(key, bookmarkEntry, geneObject) {
	var me = this;

	var variant = null;
	if (bookmarkEntry.hasOwnProperty("isProxy")) {
		variant = getProbandVariantCard().getBookmarkedVariant(me.reviseCoord(bookmarkEntry, geneObject));
		if (variant) {
			variant.isBookmark = "Y";
			variant.chrom = bookmarkEntry.chrom;
			me.bookmarkedVariants[key] = variant;
			bookmarkEntry = variant;									
		} 
	} else {
		variant = bookmarkEntry;
		variant.isBookmark = "Y";
	}
	return variant;
}

BookmarkCard.prototype.sortBookmarksByGene = function() {
	var me = this;
    var tuples = [];

    for (var key in me.bookmarkedVariants) {
    	tuples.push([key, me.bookmarkedVariants[key]]);
	}

    tuples.sort(function(a, b) { 
    	var keyA    = a[0];
    	var keyB    = b[0];
    	var startA  = a[1].start;
    	var startB  = b[1].start;
    	var refAltA = a[1].ref + "->" + a[1].alt;
    	var refAltB = b[1].ref + "->" + b[1].alt;

    	var geneA = me.parseKey(keyA).gene;
    	var geneB = me.parseKey(keyB).gene;

    	if (geneA == geneB) {
    		if (startA == startB) {
				return refAltA < refAltB ? 1 : refAltA > refAltB ? -1 : 0;
    		} else {
	    		return startA < startB ? 1 : startA > startB ? -1 : 0;
    		}
    	} else {
	    	return geneA < geneB ? 1 : geneA > geneB ? -1 : 0;
    	}
    });

    var length = tuples.length;
    var sortedBookmarks = {};
    me.bookmarkedGenes = {};
    while (length--) {
    	var key   = tuples[length][0];
    	var value = tuples[length][1];
    	var geneName = me.parseKey(key).gene;
    	
    	sortedBookmarks[key] = value;

    	var keys = me.bookmarkedGenes[geneName];
    	if (keys == null) {
    		keys = [];
    	}
    	keys.push(key);
    	me.bookmarkedGenes[geneName] = keys;
    }

    me.bookmarkedVariants = sortedBookmarks;
}

BookmarkCard.prototype.isBookmarkedGene = function(geneName) {
	return this.bookmarkedGenes[geneName] != null;
}


BookmarkCard.prototype.refreshBookmarkList = function() {
	var me = this;
	var container = d3.select('#bookmark-card #bookmark-panel');
	container.selectAll('.bookmark-gene').remove();

	if (Object.keys(this.bookmarkedVariants).length > 0) {
		$('#edit-bookmarks-box').removeClass("hide");
	} else {
		$('#edit-bookmarks-box').addClass("hide");
		$('#bookmark-panel').removeClass("editmode");
		$('#bookmark-card #done-edit-bookmarks').addClass("hide");
		$('#bookmark-card #edit-bookmarks').removeClass("hide");
	}

	// Sort bookmarks by gene, then start position
	me.sortBookmarksByGene();


	container.selectAll(".bookmark-gene")
	         .data(d3.entries(this.bookmarkedGenes))
	         .enter()
	         .append("div")
	         .attr("class", "bookmark-gene")
	         .append("a")
	         .attr("class", "bookmark-gene")
	         .text(function(entry,i) {
	         	var geneName = entry.key;

	         	var entryKeys = entry.value;
	         	var chr = me.parseKey(entryKeys[0]).chr;
	         	if (chr.indexOf("chr") < 0) {
	         		chr = "chr " + chr;
	         	}

	         	return  geneName + " " + chr;
	         })
	         .on('click', function(entry,i) {
	         	d3.select('#bookmark-card #bookmark-panel a.current').classed("current", false);
	         	var currentBookmarkGene = d3.select(this);
	         	var currentBookmarkDiv = d3.select(this.parentNode);
	         	currentBookmarkGene.classed("current", true);

	         	me.selectedBookmarkKey = entry.key;

				var geneName = entry.key;
				var bookmarkKeys = entry.value;

				// Remove any locked tooltip, hide coordinate frame
				unpinAll();

				var validateBookmarksFound = function() {
					bookmarkKeys.forEach( function(key) {		
						if (me.resolveBookmarkedVariant(key, me.bookmarkedVariants[key], window.gene) == null) {
							currentBookmarkDiv.selectAll("a.bookmark").filter(function(entry) {
								return entry.key == key;
							}).select("span.not-found").classed("hide", false);
						}
					});
				}

				if (window.gene.gene_name != geneName || !getProbandVariantCard().isLoaded()) {
					genesCard.selectGene(geneName, function() {
						me._flagBookmarksForGene(getProbandVariantCard(), window.gene, bookmarkKeys, true);
						validateBookmarksFound();
					});
				} else {
					me._flagBookmarksForGene(getProbandVariantCard(), window.gene, bookmarkKeys, true);
					validateBookmarksFound();
				}				
			});

	me.addPhenotypeGlyphs(container);
	me.addCallVariantsButton(container);

	container.selectAll("div.bookmark-gene")
	         .each( function(entry, i) {
	         	var geneContainer = d3.select(this);

	         	var keys = entry.value;
	         	var bookmarkedVariantsForGene = {};
	         	keys.forEach( function(key) {
	         		bookmarkedVariantsForGene[key] = me.bookmarkedVariants[key];
	         	});

	         	var bookmark = geneContainer.selectAll("div.bookmark-box")
	         	     .data(d3.entries(bookmarkedVariantsForGene))
	         	     .enter()
	         	     .append("div")
	         	     .attr("class", "bookmark-box");

			    bookmark.append("a")
			            .attr("class", "bookmark")
			            .on('click', function(entry,i) {
				         	d3.select('#bookmark-card #bookmark-panel a.current').classed("current", false);
		         			var currentBookmark = d3.select(this);
		         			currentBookmark.classed("current", true);

		         			me.selectedBookmarkKey = entry.key;

				         	var geneName = me.parseKey(entry.key).gene;
							var bookmarkEntry = entry.value;
							var key = entry.key;

							// Remove any locked tooltip, hide coordinate frame
							unpinAll();


							if (window.gene.gene_name != geneName  || !getProbandVariantCard().isLoaded()) {
								genesCard.selectGene(geneName, function(variantCard) {
									var variant = me.resolveBookmarkedVariant(key, bookmarkEntry, window.gene);
									if (variant) {
										me._flagBookmark(variantCard, window.gene, variant, key);
									} else {
										currentBookmark.select("span.not-found").classed("hide", false);
									}
								});
							} else {
								var variant = me.resolveBookmarkedVariant(key, bookmarkEntry, window.gene);
								if (variant) {
									me._flagBookmark(getProbandVariantCard(), window.gene, variant, key);
								} else {
									currentBookmark.select("span.not-found").classed("hide", false);
								}					
							}

							
			            });
	        });
			
	


	container.selectAll(".bookmark")
	 		 .append("span")
	         .attr("class", "variant-symbols");

	 container.selectAll(".bookmark")
	 		 .append("span")
	         .attr("class", "variant-label");

	 container.selectAll(".bookmark")
	 		 .append("span")
	         .attr("class", "not-found hide");	         

	 container.selectAll(".bookmark")
	 		 .append("span")
	         .attr("class", "favorite-indicator")
	         .style("float", "right");
	        
	container.selectAll(".bookmark span.variant-label")
	         .text(function(entry,i) {	
	         	var key = entry.key;
	         	var bookmarkEntry = entry.value;

	         	var rsId = getRsId(bookmarkEntry);

				// Strip off gene name and chr
				var bm = me.parseKey(key);
	         	return bm.start + " " + bm.ref + "->" + bm.alt + (rsId ? " " + rsId : "");
	         });

	container.selectAll(".bookmark span.not-found")
	         .text("Variant not found");

	container.selectAll(".bookmark .variant-symbols")
         .each( function(entry, i) {



		    var selection = d3.select(this);
         	var variant = entry.value;	   

         	// Construct variant impact, clinvar, sift, polyphen objects from imported record fields
         	var impact = null;
         	var clinvarClinSig = null;
         	var polyphen = null;
         	var sift = null;
         	var inheritance = null;


         	if (variant.isProxy) {
         		impact = {};
         		if (variant.highestImpact) {
	         		variant.highestImpact.split(",").forEach(function(i) {
	         			impact[i] = "";
	         		})
         		} else if (variant.impact) {
	         		variant.impact.split(",").forEach(function(i) {
	         			impact[i] = "";
	         		})         			
         		}
         		if (variant.clinvarClinSig) {
             		clinvarClinSig = {};
	         		variant.clinvarClinSig.split(",").forEach(function(c) {
	         			clinvarClinSig[c.split(" ").join("_")] = "";
	         		})
         		}

         		if (variant.polyphen) {
	         		polyphen = {};
	         		variant.polyphen.split(",").forEach(function(p) {
	         			polyphen[p.split(" ").join("_")] = "";
	         		})         			
         		}
         		if (variant.SIFT) {
	         		sift = {};
	         		variant.SIFT.split(",").forEach(function(s) {
	         			sift[s.split(" ").join("_")] = "";
	         		})
         		}
         		if (variant.inheritance) {
	         		inheritance = variant.inheritance.split(" ").join("");
         		}

         	} else {
	         	var impactField = filterCard.getAnnotationScheme().toLowerCase() == 'snpeff' ? 'impact' : IMPACT_FIELD_TO_FILTER;      
	         	impact = variant[impactField];

	         	clinvarClinSig = variant.clinVarClinicalSignificance;

	         	polyphen = variant.vepPolyPhen;

	         	sift = variant.vepSIFT;

	         	inheritance = variant.inheritance;
         	}
         	if (impact) {
	         	for (var theImpact in impact) {		         		
         			var svg = selection.append("svg")
								       .attr("class", "impact-badge")
								       .attr("height", 12)
								       .attr("width", 14);
		         	var impactClazz =  'impact_' + theImpact.toUpperCase();
		         	matrixCard.showImpactBadge(svg, variant, impactClazz);	         		
	         	}	         		
         	}
         	if (clinvarClinSig) {
         		var lowestValue = 9999;
         		var lowestClazz = null; 
         		for (var clinvar in clinvarClinSig) {
         			if (matrixCard.clinvarMap[clinvar]) {
         				if (matrixCard.clinvarMap[clinvar].value < lowestValue) {
         					lowestValue = matrixCard.clinvarMap[clinvar].value;
         					lowestClazz = matrixCard.clinvarMap[clinvar].clazz;
         				}
         				
         			}
         		}
         		if (lowestClazz != null && lowestClazz != '') {
					var options = {width:10, height:10, transform: 'translate(0,1)', clazz: lowestClazz};
					var svg = selection.append("svg")
								       .attr("class", "clinvar-badge")
								       .attr("height", 12)
								       .attr("width", 14);
			        matrixCard.showClinVarSymbol(svg, options);	         		
     			}

         	}
         	if (sift) {
				for (var theSIFT in sift) {
					if (matrixCard.siftMap[theSIFT]) {
		         		var clazz = matrixCard.siftMap[theSIFT].clazz;
		         		var badge = matrixCard.siftMap[theSIFT].badge;
		         		if (clazz != '') {
							var options = {width:11, height:11, transform: 'translate(0,1)', clazz: clazz};
							var svg = selection.append("svg")
								        .attr("class", "sift-badge")
								        .attr("height", 12)
								        .attr("width", 14);
					        matrixCard.showSiftSymbol(svg, options);	         		
		         		}							
					}

         		}
         	}
         	if (polyphen) {
				for (var thePolyphen in polyphen) {
					if (matrixCard.polyphenMap[thePolyphen]) {
		         		var clazz = matrixCard.polyphenMap[thePolyphen].clazz;
		         		var badge = matrixCard.polyphenMap[thePolyphen].badge;
		         		if (clazz != '') {
							var options = {width:10, height:10, transform: 'translate(0,2)', clazz: clazz};
							var svg = selection.append("svg")
								        .attr("class", "polyphen-badge")
								        .attr("height", 12)
								        .attr("width", 14);
					        matrixCard.showPolyPhenSymbol(svg, options);	         		
		         		}
					}
         		}
         	}
         	if (inheritance) {
         		if (inheritance == 'recessive') {
					var svg = selection.append("svg")
								        .attr("class", "inheritance-badge")
								        .attr("height", 14)
								        .attr("width", 16);
					var options = {width: 18, height: 16, transform: "translate(-1,1)"};
					matrixCard.showRecessiveSymbol(svg, options);										        
         		} else if (inheritance == 'denovo') {
					var svg = selection.append("svg")
								        .attr("class", "inheritance-badge")
								        .attr("height", 14)
								        .attr("width", 16);
					var options = {width: 18, height: 16, transform: "translate(-1,1)"};
					matrixCard.showDeNovoSymbol(svg, options);				
         		}
         	}
         });


	container.selectAll(".bookmark-box .favorite-indicator")
         .each( function(entry, i) {
		    var selection = d3.select(this);
         	var variant = entry.value;	         


 			// favorite badge
 			var svg = selection.append("svg")
						       .attr("class", "favorite-badge")
						       .attr("height", 15)
						       .attr("width", 14);

			svg.on('click', function(d,i) {

					var selected = me.favorites.hasOwnProperty(d.key) && me.favorites[d.key] == true;
					var fill = selected ? "none" : "gold";
			   		d3.select(this).select("#favorite-badge").style("fill", fill);
			   		me.favorites[entry.key] = !selected;
			   });
			var group = svg.append("g")
			   .attr("transform", "translate(0,1)");
			group.append("use")
			   .attr("xlink:href", "#star-symbol")
			   .attr("id", "favorite-badge")
			   .attr("width", 14)
			   .attr("height", 14)
			   .style("fill", function(d,i) {
			   		var isFavorite = me.favorites.hasOwnProperty(d.key) && me.favorites[d.key] == true;
					var fill = isFavorite ? "gold" : "none";
					return fill;
			   })
			   .style("pointer-events", "none");
		
			// remove button
			var removeIcon = selection.append("i")
         	         .attr("class", "material-icons")
         	         .attr("id", "remove-bookmark")
         	         .text("close");  

 			removeIcon.on('click', function(d,i) {
					d3.event.stopPropagation(); 				
 					me.removeBookmark(d.key, d.value);
			   });

         });

		d3.selectAll('#bookmark-card a.bookmark-gene, #bookmark-card a.bookmark')
		  .filter(function(d,i) {  
		  	return d.key == me.selectedBookmarkKey; 
		  })
		  .classed("current", true);


}

BookmarkCard.prototype.showTooltip = function(html, screenX, screenY, width) {
	var me = this;

	var tooltip = d3.select('#bookmark-gene-tooltip');
	tooltip.style("z-index", 1032);
	tooltip.transition()        
	 .duration(1000)      
	 .style("opacity", .9)	
	 .style("pointer-events", "all");

	tooltip.html(html);
	var h = tooltip[0][0].offsetHeight;
	var w = width;

	var x = screenX + 30;
	var y = screenY;

	if (window.outerHeight < y + h + 30) {
		tooltip.style("width", w + "px")
			       .style("left", x + "px") 
			       .style("text-align", 'left')    
			       .style("top", (y - h) + "px")
			       .style("z-index", 1032)
			       .style("overflow-y", "hidden");
			       

	} else {
		tooltip.style("width", w + "px")
			       .style("left", x + "px") 
			       .style("text-align", 'left')    
			       .style("top", (y) + "px")
			       .style("z-index", 1032)
			       .style("overflow-y", "hidden");

	}


}

BookmarkCard.prototype.hideTooltip = function() {
	var tooltip = d3.select('#bookmark-gene-tooltip');
	tooltip.transition()        
           .duration(500)      
           .style("opacity", 0)
           .style("z-index", 0)
           .style("pointer-events", "none");
}


BookmarkCard.prototype._setPhenotypeGlyph = function(container, geneName) {
	var me = this;
	genesCard.promiseGetGenePhenotypes(geneName).then(function(data) {

			var phenotypes = data[0];
			var theGeneName = data[1];
			if (theGeneName != null && phenotypes != null && phenotypes.length > 0) {
				$(container.node()).append("<svg class=\"phenotype-badge\" height=\"16\" width=\"16\">");
				var selection = container.select(".phenotype-badge").data([{width:12, height:12,clazz: 'phenotype', translate: 'translate(0,5)', phenotypes: phenotypes}]);
				matrixCard.showPhenotypeSymbol(selection);	
				selection.on("mouseover", function(d,i) {
					
					var symbol = d3.select(this);
					var matrix = symbol.node()
                         .getScreenCTM()
                         .translate(+symbol.node().getAttribute("cx"),+symbol.node().getAttribute("cy"));
		            var screenX = window.pageXOffset + matrix.e - 20;
		            var screenY = window.pageYOffset + matrix.f + 5;
		            
					var htmlObject = genesCard.formatPhenotypesHTML(d.phenotypes);
					me.showTooltip(htmlObject.html, screenX, screenY, htmlObject.width);	
						
				});
				selection.on("mouseout", function(d,i) {
					me.hideTooltip();
				});	
			}
		});	
}

BookmarkCard.prototype.addPhenotypeGlyphs = function(container) {
	var me = this;

	var phenotypesContainer = container.selectAll("div.bookmark-gene")
	    .append("span")
	    .attr("class", "phenotypes");

	phenotypesContainer.each( function(entry, i) {
		var container = d3.select(this);
		var geneName = entry.key;
		me._setPhenotypeGlyph(container, geneName);

	});
}

BookmarkCard.prototype.addCallVariantsButton = function(container) {
	var me = this;

	
	container.selectAll("div.bookmark-gene").each( function(entry, i) {
		var geneContainer = d3.select(this);
		var geneName = entry.key;
		var entryKeys = entry.value;

		entry.transcriptsToCall = {};
		entryKeys.forEach(function(entryKey) {
			var bookmarkEntry = me.bookmarkedVariants[entryKey];
			if (bookmarkEntry.isProxy && bookmarkEntry.freebayesCalled == 'Y') {
				entry.transcriptsToCall[bookmarkEntry.transcript] = true;
				addButton = true;
			}
		});			
		if (Object.keys(entry.transcriptsToCall).length > 0) {
			var callButton = geneContainer.append("button")
			             .attr("class", "btn btn-raised btn-default bookmark-call-button")
						 .on("click", function(entry, i) {
						 	var bookmarkGeneLink = d3.select(this.parentNode).select(".bookmark-gene");
						 	var button  = d3.select(this);
						 	button.select(".call-variants-loader").classed("hide", false);
							me.selectedBookmarkKey = entry.key;

							unpinAll();
							var geneName = entry.key;
							var bookmarkKeys = entry.value;
							promiseGetCachedGeneModel(geneName).then(function(geneObject) {

								for(var transcriptId in entry.transcriptsToCall) {
									var isReady = entry.transcriptsToCall[transcriptId];
									if (isReady) {
										var theTranscript = null;
										geneObject.transcripts.forEach(function(transcript) {
											if (!theTranscript && transcript.transcript_id == transcriptId) {
												theTranscript = transcript;
											}
										});						
										if (theTranscript) {
											genesCard.selectGene(geneName, 
												 function() {

												 }, function() {
												 	
												 	jointCallVariants( function() {
												 		button.classed("hide", true);
												 		button.select(".call-variants-loader").classed("hide", true);
												 	})
												 });

										}		

									}

								}
							})

						 });
				callButton.append("img")
				          .attr("class", "call-variants-loader hide")
				          .style("width", "13px")
				          .style("height", "13px")
				          .style("margin-bottom", "1px")
				          .style("margin-right", "2px")
				          .style("display", "inline-block")
				          .attr("src", "assets/images/wheel.gif");
				callButton.append("span").text("Call variants");
		}

	});

}



BookmarkCard.prototype.addPhenotypeList = function(container) {
	     var phenotypesContainer = container.selectAll("div.bookmark-gene")
	        .append("div")
	        .attr("class", function(entry, i) {
	        	var geneName = entry.key;
	        	var html = "";
	        	var phenotypes = genePhenotypes[geneName];
	        	if (phenotypes == null || phenotypes.length == 0) {
	        		return "phenotypes-container hide";
	        	} else if (phenotypes.length > 6) {
	        		return "phenotypes-container large";
	        	}else {
	        		return "phenotypes-container";
	        	}
	        });

	     phenotypesContainer.append("div")
	        .attr("class", "phenotypes")
	        .html( function(entry,i) {
	        	var geneName = entry.key;
	        	var html = "";
	        	var phenotypes = genePhenotypes[geneName];
	        	if (phenotypes && phenotypes.length > 0) {
	        		phenotypes.forEach(function(phenotype) {
	        			
	        			html += "<div>" + phenotype.hpo_term_name + "</div>";

	        		});

	        	}
	        	return html;
	        });
	      var expander = phenotypesContainer.append("div")
	                                        .attr("class", "expander");
	      expander.append("a")
	              .attr("id", "more")
	              .text("more...")
	              .on("click", function(entry, i) {
	              	d3.select(this.parentNode.parentNode).classed("expand", true);
	              });
	      expander.append("a")
	              .attr("id", "less")
	              .text("less...")
	              .on("click", function(entry, i) {
	              	d3.select(this.parentNode.parentNode).classed("expand", false);
	              });	
}




BookmarkCard.prototype.exportBookmarks = function(scope, format = 'csv') {
	var me = this;	
	$('#export-loader span').text("Exporting " + format + " file...")
	$('#export-loader').removeClass("hide");
	$('#export-bookmarks').addClass("hide");
	$('#download-bookmarks').addClass("hide");

	// Loop through the bookmarked variants, creating a full export record for each one.
	var promises = [];
	var records = [];
	var headerRecords = [];
	var getHeader  = true;
	for (key in this.bookmarkedVariants) {
		var entry = me.bookmarkedVariants[key];	

		var geneName      = me.parseKey(key).gene;
		var transcriptId  = me.parseKey(key).transcriptId;
		var isFavorite    = me.favorites[key];	

		if (scope == "all" || isFavorite) {
			var promise = null;

			var rec = {};
			rec.start        = entry.start;
			rec.end          = entry.end;
			rec.chrom        = entry.chrom.indexOf("chr") == 0 ? entry.chrom : 'chr' + entry.chrom;
			rec.ref          = entry.ref;
			rec.alt          = entry.alt;
			rec.gene         = geneName;
			rec.transcript   = transcriptId;
			rec.starred      = isFavorite == true ? "Y" : "";	

			if (format == 'csv') {
				promise = me._promiseCreateRecord(entry, geneName, transcriptId, format, rec).then(function(record) {
					records.push(record);
				});
			} else if (format == 'vcf') {

				promise = me._promiseCreateRecord(entry, geneName, transcriptId, format, rec, getHeader).then(function(data) {
					data.forEach(function(vcfRecord) {
						if (vcfRecord.indexOf("#") == 0) {
							headerRecords.push(vcfRecord);
						} else {
							records.push(vcfRecord);
						}
					});						
				});
				getHeader = false;
			}
			promises.push(promise);
		}

	}

	// When all of the records have been created, output the csv file
	Promise.all(promises).then(function() {
		var formatDownloadButton = function(output, format) {
			$('#export-bookmarks').addClass("hide");
			$('#export-loader').addClass("hide");
			$('#download-bookmarks span').text( "Download " + format + " file");
			$('#download-bookmarks').removeClass("hide");
			createDownloadLink("#download-bookmarks", output, "gene-iobio-bookmarked-variants." + format );
		}

		var output = "";
		if (format == 'csv') {
			var sortedRecords = records.sort(VariantModel.orderVariantsByPosition);
			output = me._outputCSV(sortedRecords);
			formatDownloadButton(output, format);
		} else if (format == 'vcf') {
			var sortedRecords = records.sort(VariantModel.orderVcfRecords);
			output  = headerRecords.join("\n");
			output += "\n";
			output += sortedRecords.join("\n");
			formatDownloadButton(output, format);
		}

	});

}



BookmarkCard.prototype._outputCSV = function(records) {
	var me = this;

	// Create the column header line
	var output = "";
	me.exportFields.forEach(function(fieldName) {
		if (output.length > 0) {
			output += ",";
		}
		output += "\"" + fieldName + "\"";
	});
	output += "\n";	

	// Now create an output (csv) line for each of the bookmark records
	records.forEach(function(rec) {
		var isFirstTime = true;
		me.exportFields.forEach( function(field) {
			if (isFirstTime) {
				isFirstTime = false;
			} else {
				output += ",";
			}

			var fieldValue = rec[field] ? rec[field] : "" ;
			output +=  "\"" + fieldValue + "\"";
		});
		output += "\n";
	});
	return output;	
}


BookmarkCard.prototype._promiseCreateRecord = function(bookmarkEntry, geneName, transcriptId, format, rec, getHeader) {

	var me = this;

	return new Promise( function(resolve, reject) {
		promiseGetCachedGeneModel(geneName).then(function(theGeneObject) {
			var theTranscript = null;
			if (theGeneObject == null || theGeneObject.transcripts == null) {
				var msg = "Unable to export bookmark.  Invalid gene. " + rec.gene;
				console.log(msg);
				reject(msg);
			}
			theGeneObject.transcripts.forEach(function(transcript) {
				if (!theTranscript && transcript.transcript_id == transcriptId) {
					theTranscript = transcript;
				}
			});
			if (theTranscript) {
				getProbandVariantCard().model
				 .promiseGetVariantExtraAnnotations(theGeneObject, theTranscript, bookmarkEntry, format, getHeader)
				 .then(function(data) {
				 	var theVariant = data[0];
				 	var sourceVariant = data[1];
				 	var theRawVcfRecords = data[2];

	 				// Merge the properties of the bookmark entry with the variant with the full annotations
				 	// Always use the inheritance from the bookmarkEntry
				 	var revisedVariant = $().extend({}, sourceVariant, theVariant);

	 				// The bookmarkEntry contains fields that need to be in loaded
				 	// into the record that will be exported.  These include trio
				 	// allele counts, inheritance.  If the bookmark variant has
				 	// been refreshed with live data, bypass loading these fields
				 	// since they are already updated with latest info
				 	me.proxyBookmarkFieldsToExport.forEach(function(ftr) {
				 		var targetField = ftr.hasOwnProperty('target') ? ftr.target : ftr.field;
				 		if (ftr.hasOwnProperty('isProxy') && ftr.isProxy && sourceVariant.hasOwnProperty('isProxy') && sourceVariant.isProxy) {
					 		revisedVariant[targetField] = sourceVariant[ftr.field];
				 		} else if (!ftr.hasOwnProperty('isProxy') || !ftr.isProxy) {
				 			revisedVariant[targetField] = sourceVariant[ftr.field];
				 		}
				 	});


				 	// Set the clinvar start, alt, ref for clinvar web access
					getProbandVariantCard().model.vcf.formatClinvarCoordinates(theVariant, theVariant);

				 	// Get the clinvar data and load into the variant record
				 	var dummyVcfData  = {features: [revisedVariant]};
				 	var clinvarLoader = isClinvarOffline ? getProbandVariantCard().model._refreshVariantsWithClinvarVariants.bind(getProbandVariantCard().model, dummyVcfData) : getProbandVariantCard().model._refreshVariantsWithClinvar.bind(getProbandVariantCard().model, dummyVcfData);
					getProbandVariantCard().model
					   .vcf
					   .promiseGetClinvarRecordsImpl(dummyVcfData.features, 
					   								 getProbandVariantCard().model._stripRefName(revisedVariant.chrom), 
					   								 theGeneObject, 
					   	                             clinvarLoader)	
					   .then(function() {
							
							variantTooltip.formatContent(revisedVariant, null, "record", rec);

							if (format == 'csv') {
								resolve(rec);				 		
						 	} else {
						 		resolve(theRawVcfRecords);
						 	}


					   })                            			 	

				 	
				});

			} else {
				reject("Problem during export of bookmarked variants.  Cannot find transcript " + rec.transcript + " in gene " + rec.gene);
			}
		});
	});


}


