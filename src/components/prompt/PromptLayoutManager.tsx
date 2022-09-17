import React, { useEffect, useRef, useState } from "react";
import { PromptsState, savePrompt, updatePromptBack, updatePromptFront, } from "../../app/promptSlice";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { useAppDispatch } from "../../app/store";
import PromptBox from "./PromptBox";
import BulkPromptBox from "./BulkPromptBox";
import styled from "@emotion/styled";
import { motion } from "framer-motion";
import { AnchorHighlight } from "./AnchorHighlights";
import { HighlightFunc } from "./AnchorHighlights";

const BULK_BUTTON_HEIGHT = 43.0;

export interface PromptLayoutManagerProps {
    prompts: PromptsState,
    promptLocations: { [id: string]: PromptLocation };
    marginX: number;
    newPromptId?: string;
    clearNewPrompt?: () => any;
}

type PromptAbsoluteLocation = {top: number, bottom: number};
type PromptBoundingBoxes = { [id: string]: PromptAbsoluteLocation}

const ShadowContainer = styled.div`
    opacity: 0.0;
    pointer-events: none;
`;

function compareDOMy(a: {id: string, loc: PromptAbsoluteLocation}, b: {id: string, loc: PromptAbsoluteLocation}): number {
    if (a.loc.top > b.loc.top) return 1;
    else if (a.loc.top < b.loc.top) return -1;
    // Stable sort on tiebreaks
    else return a.id > b.id ? 1 : -1;
}

const MERGE_THRESHOLD_PIXELS = 0.0;
const PROMPT_SPACING = 12.0;
const PROMPT_SPACE_THRESHOLD = 4.0;
const TRANSITION = {duration: 0.3, ease: "easeOut"};

export function PromptLayoutManager({prompts, promptLocations, marginX, newPromptId, clearNewPrompt}: PromptLayoutManagerProps) {
    const dispatch = useAppDispatch();
    const [promptRuns, setPromptRuns] = useState<string[][]>(Object.entries(prompts).map(([id, _]) => [id]));
    const [promptOffset, setPromptOffset] = useState<{ [id: string]: number}>({});
    const bulkPromptLocations = useRef<{ [id: string]: PromptLocation}>({});
    const promptMeasureRefs = useRef<{[id: string]: HTMLDivElement | null}>({});
    const [bulkSaves, setBulkSaves] = useState<Set<string>>(new Set());
    const [highlightFunc, setHighlightFunc] = useState<HighlightFunc>();

    function clonePromptLocations(locs: { [id: string]: PromptLocation}){
        const clone: { [id: string]: PromptLocation } = {};
        Object.entries(locs).forEach(([id, loc]) => {
            const locClone = {...loc};
            clone[id] = locClone;
        });
        return clone;
    }

    useEffect(() => {
        if (Object.keys(promptMeasureRefs.current).length === Object.keys(prompts).length && Object.keys(prompts).length === Object.keys(promptLocations).length){
            // Collect bounding boxes
            const boundingBoxes: PromptBoundingBoxes = {}
            Object.entries(promptMeasureRefs.current).forEach(([id, el]) => {
                if(el){
                    const rect = el.getBoundingClientRect();
                    const top = rect.top + window.scrollY;
                    const bottom = rect.bottom + window.scrollY;
                    boundingBoxes[id] = {top, bottom};
                }
            });

            bulkPromptLocations.current = clonePromptLocations(bulkPromptLocations.current);
            
            const sortedIds = Object.entries(boundingBoxes).sort((a, b) => compareDOMy({id: a[0], loc: a[1]}, {id: b[0], loc: b[1]})).map((a) => a[0]);
            const startId = sortedIds[0];
            const runs: string[][] = [[startId]];
            var currRunStartIdx = 0;
            // Pass 1 - create bulk runs for overlapping bounding boxes of non-saved elements
            // TODO: compute width and use adjusted position instead
            for(var i = 0; i < sortedIds.length - 1; i++){
                const runStartId = runs[currRunStartIdx][0];
                const nextId = sortedIds[i + 1];
                // The top of the current run
                const currTop = boundingBoxes[runStartId].top;
                // The bottom of the bounding box of the current run
                const currBottom = boundingBoxes[runStartId].bottom;
                // The top of the bounding box being evaluated for merge
                const nextTop = boundingBoxes[nextId].top;
                if (prompts[nextId].isSaved && !bulkSaves.has(nextId)){
                    // Saved elements not in the bulk saved state are not eligible for bulk prompts, Add to its own run
                    currRunStartIdx += 1;
                    runs[currRunStartIdx] = [nextId];
                // TODO: merge threshold
                } else if (nextTop < currBottom){
                    // Lookback - add to current run if the run is eligible for merge (is not a saved prompt or in the bulk queue)
                    if (!prompts[runStartId].isSaved || bulkSaves.has(runStartId)){
                        // We are adding a prompt to a bulk prompt, for animation bookkeeping, track where its top position in the bulk is
                        const runHeight = runs[currRunStartIdx].map((id) => boundingBoxes[id].bottom - boundingBoxes[id].top).reduce((a, b) => a + b);
                        // TODO: refactor so we aren't creating a fake range, don't hardcode the button height
                        if (runs[currRunStartIdx].length === 1){
                          bulkPromptLocations.current[runStartId] = {top: currTop + BULK_BUTTON_HEIGHT, range: new Range()};
                        }
                        bulkPromptLocations.current[nextId] = {top: currTop + runHeight + BULK_BUTTON_HEIGHT, range: new Range()};
                        runs[currRunStartIdx].push(nextId); 
                    } else {
                        // Lookback is ineligable for merge - create new run
                        currRunStartIdx += 1;
                        runs[currRunStartIdx] = [nextId];
                    }
                } else {
                    // Create new run
                    currRunStartIdx += 1;
                    runs[currRunStartIdx] = [nextId];
                }
            }
            // Pass 2 - adjust saved prompt locations so that overlapping boxes are spaced out
            // TODO: use bulk button size for runs length > 1 instead
            const newPromptLocations = clonePromptLocations(promptLocations);
            const offsets: {[id: string]: number} = {}
            for(i = 0; i < runs.length - 1; i++){
                const currId = runs[i][0];
                const nextId = runs[i + 1][0];
                const currHeight = boundingBoxes[currId].bottom - boundingBoxes[currId].top;
                const currBottom = newPromptLocations[currId].top + currHeight;
                const nextTop = newPromptLocations[nextId].top;
                if (nextTop < currBottom - PROMPT_SPACE_THRESHOLD) {
                    newPromptLocations[nextId].top = currBottom + PROMPT_SPACING;
                    const addedSpace = newPromptLocations[nextId].top - promptLocations[nextId].top;
                    offsets[nextId] = addedSpace;
                    // If bulk run, track the added space
                    if (runs[i + 1].length > 1){
                      runs[i + 1].forEach((id) => {
                        bulkPromptLocations.current[id].top += addedSpace;
                      });
                    }
                }
            }
            setPromptRuns(runs.reverse());
            setPromptOffset(offsets);
        }
    }, [promptMeasureRefs, prompts, bulkSaves, promptLocations]);

    return (
        <>
        {/* This is not pretty, forgive me (prototype?) - ShadowContainer is a copy of the prompts used for measurement purposes, we don't need this but it makes some data flow easier for now */}
        <ShadowContainer>
        {
            Object.entries(prompts).map(([id, prompt]) => {
                return ( 
                    <div
                        key={id}
                        css={{
                            position: "absolute",
                            left: marginX,
                            top: promptLocations[id]?.top,
                        }}
                        ref={(el) => promptMeasureRefs.current[id] = el}
                    >
                        <PromptBox
                            prompt={prompt}
                            savePrompt={() => null}
                            forceHover={true}
                            updatePromptFront={(newPrompt) => null}
                            updatePromptBack={(newPrompt) => null}
                        />
                    </div>
                )
            })
        }
        </ShadowContainer>
        {
            promptRuns.map(ids => {
                if(ids.length === 1){
                    const id = ids[0];
                    return ( 
                        <motion.div
                            key={id}
                            css={{
                                position: "absolute",
                                left: marginX,
                            }}
                            animate={{
                                top: promptLocations[id]?.top + (promptOffset[id] ?? 0),
                            }}
                            initial={{
                              top:  bulkPromptLocations.current[id] !== undefined ? 
                                    bulkPromptLocations.current[id].top
                                  : promptLocations[id]?.top + (promptOffset[id] ?? 0),
                            }}
                            transition={TRANSITION}
                        >
                            <PromptBox
                                prompt={prompts[id]}
                                isNew={id === newPromptId}
                                savePrompt={() => 
                                    dispatch(savePrompt(id))
                                }
                                updatePromptFront={(newPrompt) => dispatch(updatePromptFront([id, newPrompt]))}
                                updatePromptBack={(newPrompt) => dispatch(updatePromptBack([id, newPrompt]))}
                                clearNew={clearNewPrompt}
                                onMouseEnter={() => highlightFunc && !prompts[id].isSaved ? highlightFunc(id, true) : null}
                                onMouseLeave={() =>  highlightFunc && !prompts[id].isSaved ? highlightFunc(id, false) : null}
                                onEditStart={() => highlightFunc ? highlightFunc(id, true) : null}
                                onEditEnd={() =>  highlightFunc ? highlightFunc(id, false) : null}
                            />
                        </motion.div>
                    )
                } else {
                    return ( 
                        <motion.div
                            key={ids.join()}
                            css={{
                                position: "absolute",
                                left: marginX,
                            }}
                            animate={{
                                top: promptLocations[ids[0]]?.top + (promptOffset[ids[0]] ?? 0)
                            }}
                            initial={{
                                top: bulkPromptLocations.current[ids[0]]?.top - BULK_BUTTON_HEIGHT
                            }}
                            transition={TRANSITION}
                        >
                            <BulkPromptBox
                                prompts={ids.map((id) => prompts[id])}
                                ids={ids}
                                savePrompt={(id) => 
                                    dispatch(savePrompt(id))
                                }
                                addToSaves={(id) => setBulkSaves(new Set(bulkSaves.add(id)))}
                                clearSaves={() => setBulkSaves(new Set())}
                                highlightFunc={highlightFunc}
                                updatePromptFront={(id, newPrompt) => dispatch(updatePromptFront([id, newPrompt]))}
                                updatePromptBack={(id, newPrompt) => dispatch(updatePromptBack([id, newPrompt]))}
                            />
                        </motion.div>
                    )
                }
            })
        }
        <AnchorHighlight
          prompts={prompts}
          promptLocations={promptLocations}
          setHighlightFunc={setHighlightFunc}
        />
        </>
    )
}
