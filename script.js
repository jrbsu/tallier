$(document).ready(function () {
    "use strict";
    
    var i = 0,
        dumptext = "",
        votes = [],
        candidates = [],
        voters = [],
        finalVotes = [],
        standings = [],
        candidateAmount = 0,
        trimHold = "",
        voteStart = new RegExp("<vote>.*"),
        candidateStart = new RegExp("<message.*");
    
    String.prototype.splitNewline = function () {
		return this.split(/\r\n|\r|\n/);
	};
    
    $('#tally-button').click(function(){
        votes = [];
        candidates = [];
        voters = [[]];
        finalVotes = [];
        standings = [];
        $('#candidate-list').html("");
        $('#votes-list').html("");
        candidateAmount = parseInt($('#candidates').val());
        
        if (!(candidateAmount > 0)) {
            alert("Enter a candidate number please");
            return;
        }
        
        dumptext = $('#dump-box').val();
        var dumpLines = dumptext.splitNewline();
        $(dumpLines).each(function (index) {
            if (this.match(candidateStart)) {
                trimHold = dumpLines[index]
                    .replace(/<message.*lang=\"uk\">/g, "")
                    .replace(/<\/message>/g, "");
                candidates.push(trimHold);
            } else if (this.match(voteStart)) {
                trimHold = dumpLines[index]
                    .replace(/<vote>/g, "")
                    .replace(/Q.{20}\+0{9}/g, "")
                votes.push(trimHold);
            }
        });
        for (i=0;i<4;i++) { // trim out the other params
            candidates.shift();
        }
        $(votes).each(function(index) {
            var j = votes[index].split(/--/).slice(0, -1);
            console.log(j);
            $(j).each(function(index) {
                j[index] = parseInt(j[index]);
            });
            voters.push(j);
        });
        console.log(voters);
        $('#candidate-list')
            .append("There are " + candidates.length + " candidates.<br />")
        
        $(candidates).each(function(index) {
            finalVotes.push(0); //init
        });
        
        var t = 0;
        $(voters).each(function(index) {
            t = voters[index].reduce((a, b) => a + b, 0);
            if(t == candidateAmount) {
                for(var k=0; k<voters[index].length; k++) {
                    if(voters[index][k] == 1) {
                        finalVotes[k]++;
                    }
                }
            }
            if (index > 0) {
                if (t !== candidateAmount) {
                    $('#votes-list').append("<span class='ineligible'>Voter " + index + " voted for " + t + " candidates, so their vote was not counted.</span><br />");
                } else {
                    $('#votes-list').append("<span class='eligible'>Voter " + index + " voted for " + t + " candidates.</span><br />");
                }
            }
        });
        
        for (var u=0; u < candidates.length; u++) {
            standings.push({'candidate': candidates[u], 'votes': finalVotes[u]});
        }
        standings.sort(function(a,b) {
           return ((a.votes > b.votes) ? -1 : ((a.votes == b.votes) ? 0 : 1));
        });
        
        var html = "<ol>";
        
        $(standings).each(function(e) {
            if (e < candidateAmount) {
                html += "<li class='success'>" + standings[e].candidate + ": " + standings[e].votes + "</li>";
            } else {
                 html += "<li>" + standings[e].candidate + ": " + standings[e].votes + "</li>";
            }
        });
        $('#candidate-list').append(html);
    });
});