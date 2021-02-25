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
        
        if (!(candidateAmount > 0)) { // if we don't have an expected number of successful candidates, stop everything
            alert("Enter a candidate number please");
            return;
        }
        
        dumptext = $('#dump-box').val();
        var dumpLines = dumptext.splitNewline();  // trimming out the actual votes and candidates
        $(dumpLines).each(function (index) {
            if (this.match(candidateStart)) {
                trimHold = dumpLines[index]
                    .replace(/<message.*lang=\"\w\w\">/g, "") // this assumes non-English, will need to be reworked for an election that does not specify language
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
                j[index] = parseInt(j[index]); // forcing the votes to be numbers and not strings. thanks javascript!
            });
            voters.push(j);
        });
        
        $('#candidate-list').append("There are " + candidates.length + " candidates and " + parseInt(voters.length-1) + " voters.<br /><br />") // voters.length is 1 too long because of an empty 0th item. .shift() doesn't seem to work so I'm leaving the hack in
        
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
            if (index > 0) { //disregard the first "voter" which is currently blank. if this is fixed later remember to remove this if statement
                if (t !== candidateAmount) {
                    $('#votes-list').append("<span class='ineligible'>Voter " + index + " voted for " + t + " candidates, so their vote was not counted.</span><br />");
                } else {
                    $('#votes-list').append("<span class='eligible'>Voter " + index + " voted for " + t + " candidates.</span><br />");
                }
            }
        });
        
        for (var u=0; u < candidates.length; u++) { // combining into one array for sorting purposes
            standings.push({'candidate': candidates[u], 'votes': finalVotes[u]});
        }
        standings.sort(function(a,b) { // perform the sort
           return ((a.votes > b.votes) ? -1 : ((a.votes == b.votes) ? 0 : 1));
        });
        
        if (standings[candidateAmount-1].votes == standings[candidateAmount].votes) { // work out if candidates n and n+1 have the same number of votes, thus necessitating a recount
            $('#candidate-list').append("<b>Looks like a revote is needed.</b> " + standings[candidateAmount-1].candidate + " (" + candidateAmount + "th place) and " + standings[candidateAmount].candidate + " (" + parseInt(candidateAmount+1) + "th place) both have " + standings[candidateAmount].votes + " votes.<br /><br />")
        }
        
        var html = "<ol>";
        
        $(standings).each(function(e) { // output the vote tallies and highlight successful candidates
            if (e < candidateAmount) {
                html += "<li class='success'>" + standings[e].candidate + ": " + standings[e].votes + "</li>";
            } else {
                 html += "<li>" + standings[e].candidate + ": " + standings[e].votes + "</li>";
            }
        });
        $('#candidate-list').append(html);
    });
});