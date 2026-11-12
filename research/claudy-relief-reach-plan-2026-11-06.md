# CLAUDYBEAR slice: #59 Alpha queue measurement reach
Evidence (research/claudy-relief-reach-probe.mjs, eleven, t=2000s and 3600s): 36 Alpha arrivals frozen on Arrival·a·aNorth at 2.6 world pitch, 1.7-101.6 world before Main. #59 decision line is 56.7 world before Main. The counter only looked 12 world back (max ~4-5 cars), so high=6 never tripped: queued=4, 0 transitions.
Change: src/alphaQueueRelief.js counts Alpha general pre-Main arrivals within the lane's own decision-to-Main reach (from built lane path, cached on aControl). Lanes with no #59 crossing, and path-less fixtures, keep the 12-world window. Thresholds 6/2, redirect eligibility, permit/bus exclusion and collision rules unchanged. New focused test with a real lane.
Verify after saving: focused, targeted, full suite vs latest 28 names, build, 3 same-map traffic runs vs connector results (nine 950/0/0, eleven 119/94/2, final 81/102/8).
Risk: more Feeder->Bravo load at the Lot B west entrance/#61; watch west stalls.
