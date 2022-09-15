import React, { useEffect, useRef, useState } from "react";
import { PromptsState, savePrompt, updatePromptBack, updatePromptFront, } from "../../app/promptSlice";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { useAppDispatch } from "../../app/store";
import PromptBox from "./PromptBox";
import BulkPromptBox from "./BulkPromptBox";
import styled from "@emotion/styled";
import { motion } from "framer-motion";

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

export function PromptLayoutManager({prompts, promptLocations, marginX, newPromptId, clearNewPrompt}: PromptLayoutManagerProps) {
    const dispatch = useAppDispatch();
    const [promptRuns, setPromptRuns] = useState<string[][]>(Object.entries(prompts).map(([id, _]) => [id]));
    const [localPromptLocations, setLocalPromptLocations] = useState<{ [id: string]: PromptLocation}>({});
    const prevLocalPromptLocations = useRef<{ [id: string]: PromptLocation}>({});
    const promptMeasureRefs = useRef<{[id: string]: HTMLDivElement | null}>({});
    const [bulkSaves, setBulkSaves] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (Object.keys(promptMeasureRefs.current).length === Object.keys(prompts).length){
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

            const sortedIds = Object.entries(boundingBoxes).sort((a, b) => compareDOMy({id: a[0], loc: a[1]}, {id: b[0], loc: b[1]})).map((a) => a[0]);
            const startId = sortedIds[0];
            const runs: string[][] = [[startId]];
            var currRunStartIdx = 0;
            // Pass 1 - create bulk runs for overlapping bounding boxes of non-saved elements
            // TODO: compute width and use adjusted position instead
            for(var i = 0; i < sortedIds.length - 1; i++){
                const runStartId = runs[currRunStartIdx][0];
                const nextId = sortedIds[i + 1];
                // The bottom of the bounding box of the current run
                const currBottom = boundingBoxes[runStartId].bottom;
                // The top of the bounding box being evaluated for merge
                const nextTop = boundingBoxes[nextId].top;
                if (prompts[nextId].isSaved && !bulkSaves.has(nextId)){
                    // Saved elements not in the bulk saved state are not eligible for bulk prompts, Add to its own run
                    currRunStartIdx += 1;
                    runs[currRunStartIdx] = [nextId];
                } else if (nextTop < currBottom - MERGE_THRESHOLD_PIXELS){
                    // Lookback - add to current run if the run is eligible for merge (is not a saved prompt or in the bulk queue)
                    if (!prompts[runStartId].isSaved || bulkSaves.has(runStartId)){
                        runs[currRunStartIdx].push(nextId);
                        //const runHeight = 
                        //promptLocations[nextId].top = promptLocations[runStartId].top + 
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
            prevLocalPromptLocations.current = promptLocations;
            const newPromptLocations = Object.assign({}, promptLocations);
            for(i = 0; i < runs.length - 1; i++){
                const currId = runs[i][0];
                const nextId = runs[i + 1][0];
                const currHeight = boundingBoxes[currId].bottom - boundingBoxes[currId].top;
                const currBottom = newPromptLocations[currId].top + currHeight;
                const nextTop = newPromptLocations[nextId].top;
                if (nextTop < currBottom - PROMPT_SPACE_THRESHOLD) {
                    newPromptLocations[nextId].top = currBottom + PROMPT_SPACING;
                }
            }
            setPromptRuns(runs.reverse());
            setLocalPromptLocations(newPromptLocations);
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
                                top: localPromptLocations[id]?.top,
                            }}
                            animate={{
                                top: localPromptLocations[id]?.top
                            }}
                            initial={{top: prevLocalPromptLocations.current[id]?.top}}
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
                                top: localPromptLocations[ids[0]]?.top,
                            }}
                            animate={{
                                top: localPromptLocations[ids[0]]?.top
                            }}
                            initial={{top: prevLocalPromptLocations.current[ids[0]]?.top}}
                        >
                            <BulkPromptBox
                                prompts={ids.map((id) => prompts[id])}
                                ids={ids}
                                savePrompt={(id) => 
                                    dispatch(savePrompt(id))
                                }
                                addToSaves={(id) => setBulkSaves(new Set(bulkSaves.add(id)))}
                                clearSaves={() => setBulkSaves(new Set())}
                            />
                        </motion.div>
                    )
                }
            })
        }
        </>
    )
}
