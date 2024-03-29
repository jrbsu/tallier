$(document).ready(function () {
    "use strict";
    
    var i = 0,
        barred = false,
        dumptext = "",
        votes = [],
        candidates = [],
        lang = "",
        voters = [],
        finalVotes = [],
        standings = [],
        candidateAmount = 0,
        mustVote = document.querySelector('input[name="must-vote"]'),
        trimHold = "",
        candidateList = "",
        invalidCandidate = "",
        voteStart = new RegExp("<vote>.*"),
        candidateStart = new RegExp("<message.*");
    
    String.prototype.splitNewline = function () {
		return this.split(/\r\n|\r|\n/);
	};
    
    $('#get-candidates-button').click(function(){
        votes = [];
        candidates = [];
        voters = [[]];
        finalVotes = [];
        standings = [];
        $('#results-list').html("");
        $('#candidate-list').html("");
        $('#votes-list').html("");
        candidateList = "";
        candidateAmount = parseInt($('#candidates').val());
        lang = $('#lang').val();
        lang = new RegExp("<message.*lang=\"" + lang + "\">");
        
        if (!(candidateAmount > 0)) { // if we don't have an expected number of successful candidates, stop everything
            alert("Enter a candidate number please");
            return;
        }
        
        dumptext = $('#dump-box').val();
        
        dumptext = dumptext.replace(/<SecurePoll.[\s\S]*?(?=\n.*?(<option)|$)/g, ""); // trim out other messages that it confuses for candidate names
        
        var dumpLines = dumptext.splitNewline();  // trimming out the actual votes and candidates
        $(dumpLines).each(function (index) {
            if (this.match(lang)) {
                trimHold = dumpLines[index]
                    .replace(lang, "")
                    .replace(/<\/message>/g, "");
                candidates.push(trimHold);
            } else if (this.match(voteStart)) {
                trimHold = dumpLines[index]
                    .replace(/<vote>/g, "")
                    .replace(/Q.{20}\+0{9}/g, "")
                votes.push(trimHold);
            }
        });
        $(votes).each(function(index) {
            var j = votes[index].split(/--/).slice(0, -1);
            $(j).each(function(index) {
                j[index] = parseInt(j[index]); // forcing the votes to be numbers and not strings. thanks javascript!
            });
            voters.push(j);
        });
        
        candidateList += "There are " + candidates.length + " candidates and " + parseInt(voters.length-1) + " voters.<br /><br /><table><tr><th>Candidate</th><th>Ineligible?</th></tr>"; // voters.length is 1 too long because of an empty 0th item. .shift() doesn't seem to work so I'm leaving the hack in this bit is exclusive to this election
        
        $(candidates).each(function(index){
            candidateList += "<tr><td>" + candidates[index] + "</td><td><input type=checkbox name='candidate-checkbox[]' id='candidate-checkbox-" + index + "' value=" + index + "></td></tr>";
        });
        
        candidateList += "</table>";
        
        $('#candidate-list').html(candidateList);
        
        $('#tally-button').prop('disabled', false)
    });
    
    $('#tally-button').click(function(){
        votes = [];
        candidates = [];
        voters = [[]];
        finalVotes = [];
        standings = [];
        $('#results-list').html("");
        $('#votes-list').html("");
        candidateAmount = parseInt($('#candidates').val());
        lang = $('#lang').val();
        lang = new RegExp("<message.*lang=\"" + lang + "\">");
        
        if (!(candidateAmount > 0)) { // if we don't have an expected number of successful candidates, stop everything
            alert("Enter a candidate number please");
            return;
        }
        
        dumptext = $('#dump-box').val();
        
        dumptext = dumptext.replace(/<SecurePoll.[\s\S]*?(?=\n.*?(<option)|$)/g, ""); // trim out other messages that it confuses for candidate names
        
        var dumpLines = dumptext.splitNewline();  // trimming out the actual votes and candidates
        $(dumpLines).each(function (index) {
            if (this.match(lang)) {
                trimHold = dumpLines[index]
                    .replace(lang, "")
                    .replace(/<\/message>/g, "");
                candidates.push(trimHold);
            } else if (this.match("Q000")) {
                trimHold = dumpLines[index]
                    .replace(/<vote>/g, "")
                    .replace(/Q.{20}\+0{9}/g, "");
                votes.push(trimHold);
            }
        });
        $(votes).each(function(index) {
            var j = votes[index].split(/--/).slice(0, -1);
            $(j).each(function(index) {
                j[index] = parseInt(j[index]); // forcing the votes to be numbers and not strings. thanks javascript!
            });
            voters.push(j);
        });
        
        $('#candidate-list').append("There are " + candidates.length + " candidates and " + parseInt(voters.length-1) + " voters.<br />") // voters.length is 1 too long because of an empty 0th item. .shift() doesn't seem to work so I'm leaving the hack in
        
        var ineligible = [];
        
        $("input[name='candidate-checkbox[]']:checked").each(function (){
            ineligible.push(parseInt($(this).val()));
        });
        
        $(candidates).each(function(index) {
            finalVotes.push(0); //init
        });
        
        var t = 0; //init
        
        if (mustVote.checked) { // checking to make sure we need this requirement, otherwise we'll just include all votes
            $(voters).each(function(index) {
                barred = false;
                invalidCandidate = "";
                t = voters[index].reduce((a, b) => a + b, 0); // add up how many total votes
                if(t == candidateAmount) {
                    for (var k=0; k<voters[index].length; k++) { // first work out if they're barred
                        if (voters[index][k] == 1 && ineligible.includes(k)) {
                            barred = true;
                            invalidCandidate = candidates[k];
                        }
                    }
                    for (var k=0; k<voters[index].length; k++) { // then tally
                        if(voters[index][k] == 1 && barred !== true) {
                            finalVotes[k]++;
                        }
                    }
                }
                if (index > 0) { //disregard the first "voter" which is currently blank. if this is fixed later remember to remove this if statement
                    if (t !== candidateAmount) {
                        $('#votes-list').append("<span class='ineligible'>Voter " + index + " voted for " + t + " candidates, so their vote was not counted.</span><br />");
                    } else if (barred === true) {
                        $('#votes-list').append("<span class='ineligible'>Voter " + index + " voted for a prohibited candidate (" + invalidCandidate + "), so their vote was not counted.</span><br />");
                    } else {
                        $('#votes-list').append("<span class='eligible'>Voter " + index + " voted for " + t + " candidates.</span><br />");
                    }
                }
            });
        } else {
            $(voters).each(function(index) {
                barred = false;
                invalidCandidate = "";
                t = voters[index].reduce((a, b) => a + b, 0);
                for (var k=0; k<voters[index].length; k++) { // first work out if they're barred
                    if (voters[index][k] == 1 && ineligible.includes(k)) {
                        barred = true;
                        invalidCandidate = candidates[k];
                    }
                }
                for(var k=0; k<voters[index].length; k++) {
                    if(voters[index][k] == 1 && barred !== true) {
                        finalVotes[k]++;
                    }
                }
                if (index > 0) { //disregard the first "voter" which is currently blank. if this is fixed later remember to remove this if statement
                    if (barred === true) {
                        $('#votes-list').append("<span class='ineligible'>Voter " + index + " voted for a prohibited candidate (" + invalidCandidate + "), so their vote was not counted.</span><br />");
                    } else {
                        $('#votes-list').append("<span class='eligible'>Voter " + index + " voted for " + t + " candidates.</span><br />");
                    }
                }
            });
        }
        
        for (var u=0; u < candidates.length; u++) { // combining into one array for sorting purposes
            standings.push({'candidate': candidates[u], 'votes': finalVotes[u]});
        }
        standings.sort(function(a,b) { // perform the sort
           return ((a.votes > b.votes) ? -1 : ((a.votes == b.votes) ? 0 : 1));
        });
        
        if (mustVote.checked) {
            if (standings[candidateAmount-1].votes == standings[candidateAmount].votes) { // work out if candidates n and n+1 have the same number of votes, thus necessitating a recount
                $('#results-list').append("<b>Looks like a revote is needed.</b> " + standings[candidateAmount-1].candidate + " (" + candidateAmount + "th place) and " + standings[candidateAmount].candidate + " (" + parseInt(candidateAmount+1) + "th place) both have " + standings[candidateAmount].votes + " votes.<br /><br />")
            }
        }
        
        var html = "<ol>";
        
        $(standings).each(function(e) { // output the vote tallies and highlight successful candidates
            if (e < candidateAmount) {
                html += "<li class='success'>" + standings[e].candidate + ": " + standings[e].votes + "</li>";
            } else {
                 html += "<li>" + standings[e].candidate + ": " + standings[e].votes + "</li>";
            }
        });
        $('#results-list').append(html);
        
        $('#tally-button').prop('disabled',true);
        
        $('#candidate-list').html("");
    });
});
