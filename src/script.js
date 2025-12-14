$(document).ready(function () {
    "use strict";
    
    const voteStart = new RegExp("<vote>");
    let candidates = [], votes = [], voters = [[]], finalVotes = [], standings = [];
    let candidateAmount; // Define candidateAmount globally

    // Helper function to split text by newlines
    String.prototype.splitNewline = function () {
        return this.split(/\r\n|\r|\n/);
    };
    
    function showHolderDiv(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'block';
        } else {
            console.error(`Element with id ${id} not found`);
        }
    }

    function hideHolderDiv(id) {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        } else {
            console.error(`Element with id ${id} not found`);
        }
    }

    // Function to extract candidates and votes from the input text
    function extractCandidatesVotes() {
        const dumptext = $('#dump-box').val();
        const wantedLang = ($('#lang').val() || '').trim();

        // reset (important if user clicks multiple times)
        candidates = [];
        votes = [];
        voters = [];

        // --- Parse XML safely ---
        const xmlDoc = new DOMParser().parseFromString(dumptext, "text/xml");
        const parseErr = xmlDoc.querySelector("parsererror");
        if (parseErr) {
            console.error("XML parse error:", parseErr.textContent);
            throw new Error("Could not parse XML dump (parsererror).");
        }

        // Pick the first <question>. (If you later support multiple questions, select by id.)
        const questionEl = xmlDoc.querySelector("question");
        if (!questionEl) throw new Error("No <question> found in dump.");

        const optionEls = Array.from(questionEl.querySelectorAll("option"));
        if (optionEls.length === 0) throw new Error("No <option> found in first <question>.");

        // Map SecurePoll answer token -> candidate index
        // In your example: option <id>1900</id> corresponds to A0000076C because 1900(dec)=0x76C
        const answerToIndex = new Map();

        function optionIdToAnswerToken(optIdDec) {
            const hex = Number(optIdDec).toString(16).toUpperCase().padStart(8, '0');
            return `A${hex}`;
        }

        function getOptionLabel(optEl) {
            // Prefer exact lang match, else fall back to any message[name="text"]
            const byLang = optEl.querySelector(`message[name="text"][lang="${wantedLang}"]`);
            const any = optEl.querySelector(`message[name="text"]`);
            const msg = byLang || any;
            return (msg ? msg.textContent : "").trim();
        }

        optionEls.forEach((optEl, idx) => {
            const idEl = optEl.querySelector("id");
            const optId = idEl ? parseInt(idEl.textContent.trim(), 10) : NaN;

            const label = getOptionLabel(optEl) || `Option ${idx + 1}`;
            candidates.push(label);

            if (!Number.isNaN(optId)) {
                answerToIndex.set(optionIdToAnswerToken(optId), idx);
            }
        });

        // --- Votes ---
        const voteEls = Array.from(xmlDoc.querySelectorAll("vote"));
        voteEls.forEach((vEl) => {
            let t = (vEl.textContent || "").trim();
            if (!t) return;

            // New format: {"vote":"...--"}  (entities like &quot; are decoded by XML parser already)
            let voteStr = "";
            if (t.startsWith("{")) {
                try {
                    const obj = JSON.parse(t);
                    voteStr = obj.vote || "";
                } catch (e) {
                    console.error("Failed to JSON.parse <vote> payload:", t, e);
                    return;
                }
            } else {
                // Fallback (older dumps or unexpected formats)
                voteStr = t;
            }

            if (!voteStr) return;

            const ballot = Array(candidates.length).fill(0);

            // Split on "--" and ignore empty tail from the trailing "--"
            voteStr.split("--").filter(Boolean).forEach((seg) => {
                // segment looks like: Q0000076B-A0000076C-S+0000000001
                const m = seg.match(/A([0-9A-F]{8})-S\+(\d{10})/i);
                if (!m) return;

                const answerToken = `A${m[1].toUpperCase()}`;
                const idx = answerToIndex.get(answerToken);
                if (idx === undefined) return;

                const score = parseInt(m[2], 10);
                ballot[idx] = score > 0 ? 1 : 0; // treat any non-zero score as "support"
            });

            votes.push(ballot);
        });

        voters = votes;

        console.log("Candidates:", candidates);
        console.log("Votes parsed:", votes.length, votes);
    }

    // Function to display the candidate list with ineligibility checkboxes
    function displayCandidateList() {
        const lang = document.getElementById("language-toggle").value; // Get selected language
        let candidateList = `<table><tr><th>${formatMessage(translations[lang].candidates)}</th><th>${formatMessage(translations[lang].candidateIneligible)}</th></tr>`;
        candidates.forEach((candidate, index) => {
            candidateList += `<tr><td data-label="Candidate">${candidate}</td>
                <td data-label="Ineligible?"><input type="checkbox" name="candidate-checkbox[]" id="candidate-checkbox-${index}" value="${index}"></td></tr>`;
        });
        candidateList += `</table>`;
        $('#candidate-list').html(candidateList);
        $('#tally-button').prop('disabled', false);
        console.log("Candidate list displayed."); // Debug: Candidate list shown
    }

    // Helper function to replace placeholders in strings
    function formatMessage(message, ...values) {
        return message.replace(/{(\d+)}/g, (match, number) => {
            return typeof values[number] != 'undefined' ? values[number] : match;
        });
    }

    // Tally votes and display results
    function tallyVotes(mustVote, ineligibleCandidates) {
        finalVotes = Array(candidates.length).fill(0); // Initialize finalVotes array
        const lang = document.getElementById("language-toggle").value; // Get selected language

        voters.forEach((voter, index) => {
            let barred = false;
            let invalidCandidate = "";
            const totalVotes = voter.reduce((a, b) => a + b, 0); // Count how many candidates were voted for

            if (totalVotes === candidateAmount || !mustVote.checked) {
                voter.forEach((vote, k) => {
                    if (vote === 1 && ineligibleCandidates.includes(k)) {
                        barred = true;
                        invalidCandidate = candidates[k];
                    }
                });

                if (!barred) {
                    voter.forEach((vote, k) => {
                        if (vote === 1) {
                            finalVotes[k]++;
                        }
                    });
                    $('#votes-list').append(
                        formatMessage(translations[lang].voterEligible, index + 1, totalVotes) + "<br />"
                    );
                } else {
                    $('#votes-list').append(
                        "<span class='ineligible'>" + formatMessage(translations[lang].voterIneligibleCandidate, index + 1, totalVotes, invalidCandidate) + "</span><br />"
                    );
                }
            } else {
                $('#votes-list').append(
                    "<span class='ineligible'>" + formatMessage(translations[lang].voterIneligibleCount, index + 1, totalVotes) + "</span><br />"
                );
            }
        });

        standings = candidates.map((candidate, index) => ({ candidate, votes: finalVotes[index] }));
        standings.sort((a, b) => b.votes - a.votes); // Sort candidates by votes

        if (mustVote.checked && standings[candidateAmount - 1].votes === standings[candidateAmount].votes) {
            $('#results-list').append(
                formatMessage(
                    translations[lang].revoteNeeded,
                    standings[candidateAmount - 1].candidate,
                    candidateAmount,
                    standings[candidateAmount].candidate,
                    candidateAmount + 1,
                    standings[candidateAmount].votes
                ) + "<br /><br />"
            );
        }

        let html = "<ol>";
        standings.forEach((entry, index) => {
            const successClass = index < candidateAmount ? "class='success'" : "";
            html += `<li ${successClass}>${entry.candidate}: ${entry.votes}</li>`;
        });
        html += "</ol>";
        $('#results-list').append(html);

        $('#tally-button').prop('disabled', true);
        $('#candidate-list').html("");
    }

    // Event handler for getting candidates
    $('#get-candidates-button').click(function () {
        candidates = [];
        votes = [];
        voters = [[]]; // Reset voters
        finalVotes = [];
        standings = [];
        $('#results-list').html("");
        $('#candidate-list').html("");
        $('#votes-list').html("");
    
        const candidateAmountInput = $('#candidates').val(); // Get the candidate amount value
        const dumpBoxInput = $('#dump-box').val(); // Get the dump box value
        
        // Get selected language from the dropdown
        const lang = document.getElementById("language-toggle").value;
        console.log("Selected language:", lang); // Debugging the selected language
    
        if (candidateAmountInput === "" || dumpBoxInput === "") {
            alert(translations[lang].requiredFieldsError || "Please ensure all required fields are filled.");
            console.error("Error: Input fields cannot be blank."); // Log error for debugging
            return; // Exit the function if inputs are invalid
        }
    
        candidateAmount = parseInt(candidateAmountInput); // Convert candidate amount to integer
        console.log("Candidate amount set to:", candidateAmount); // Debug: Candidate amount
    
        if (!(candidateAmount > 0)) {
            alert(translations[lang].candidateNumberError || "Please enter a valid number of candidates.");
            return;
        }
    
        extractCandidatesVotes(); // Extract votes and candidates
    
        // Check if at least one candidate was found
        if (candidates.length === 0) {
            alert(translations[lang].malformedDumpError);
            console.error("Error: No candidates found. Possible malformed dump.");
            return;
        }
    
        displayCandidateList(); // Display candidates for selection
        showHolderDiv('candidate-list');
        hideHolderDiv('votes-list');
        hideHolderDiv('results-list');
    });    

    // Event handler for tallying votes
    $('#tally-button').click(function () {
        // Get ineligible candidates from the checkboxes
        let ineligibleCandidates = [];
        $("input[name='candidate-checkbox[]']:checked").each(function () {
            ineligibleCandidates.push(parseInt($(this).val()));
        });

        tallyVotes($('#must-vote')[0], ineligibleCandidates); // Tally votes and display results
        hideHolderDiv('candidate-list');
        showHolderDiv('votes-list');
        showHolderDiv('results-list');
    });
});

// Language translations
const translations = {
    en: {
        candidatesLabel: "Expected successful candidates",
        langLabel: "Vote language code",
        mustVoteLabel: "Voters must vote for exact number of candidates?",
        getCandidatesButton: "Get candidates",
        tallyButton: "Tally",
        candidates: "Candidate",
        candidateIneligible: "Ineligible?",
        voterEligible: "✅ Voter {0} voted for {1} candidates.",
        voterIneligibleCount: "❌ Voter {0} voted for {1} candidates, so their vote was not counted.",
        voterIneligibleCandidate: "❌ Voter {0} voted for a prohibited candidate ({2}), so their vote was not counted.",
        revoteNeeded: "<b>Looks like a revote is needed.</b> {0} ({1}th place) and {2} ({3}th place) both have {4} votes.",
        candidateNumberError: "Please enter a number of candidates.",
        requiredFieldsError: "Please ensure all required fields are filled.",
        malformedDumpError: "No candidates found. The dump may be malformed."
    },
    uk: {
        candidatesLabel: "Очікувана кількість успішних кандидатів",
        langLabel: "код мови",
        mustVoteLabel: "Виборці повинні голосувати за точну кількість кандидатів?",
        getCandidatesButton: "Отримати кандидатів",
        tallyButton: "Підрахуйте голоси",
        candidates: "Кандидат",
        candidateIneligible: "Не відповідає вимогам?",
        voterEligible: "✅ Виборець {0} проголосував за {1} кандидата(ів).",
        voterIneligibleCount: "❌ Виборець {0} проголосував за {1} кандидата(ів), тому його голос не був зарахований.",
        voterIneligibleCandidate: "❌ Виборець {0} проголосував за забороненого кандидата ({2}), тому його голос не був зарахований.",
        revoteNeeded: "<b>Потрібне повторне голосування.</b> {0} ({1} місце) і {2} ({3} місце) мають однакову кількість голосів ({4} голосів).",
        candidateNumberError: "Будь ласка, введіть кількість кандидатів.",
        requiredFieldsError: "Будь ласка, переконайтеся, що всі обов'язкові поля заповнені.",
        malformedDumpError: "Кандидати не знайдені. Можливо, дамп пошкоджений."
    }
};

function updateLanguage(lang) {
    document.querySelector("label[for='candidates']").innerHTML = translations[lang].candidatesLabel;
    document.querySelector("label[for='lang']").innerHTML = translations[lang].langLabel;
    document.querySelector("label[for='must-vote']").innerHTML = translations[lang].mustVoteLabel;
    document.getElementById("get-candidates-button").innerHTML = translations[lang].getCandidatesButton;
    document.getElementById("tally-button").innerHTML = translations[lang].tallyButton;
}

// Event listener for language toggle
document.getElementById("language-toggle").addEventListener("change", function() {
    const selectedLang = this.value;
    updateLanguage(selectedLang);
});

// Set default language on load
document.addEventListener("DOMContentLoaded", function() {
    const defaultLang = document.getElementById("language-toggle").value;
    updateLanguage(defaultLang);
});
