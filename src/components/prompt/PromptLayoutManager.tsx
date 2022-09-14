import React, { useEffect, useState } from "react";
import { PromptsState, savePrompt, updatePromptBack, updatePromptFront, } from "../../app/promptSlice";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { useAppDispatch } from "../../app/store";
import PromptBox from "./PromptBox";
import BulkPromptBox from "./BulkPromptBox";
import styled from "@emotion/styled";

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

function compareDOMy(a: PromptAbsoluteLocation, b: PromptAbsoluteLocation): number {
    if (a.top > b.top) return 1;
    else if (a.top < b.top) return -1;
    else return 0;
}

const MERGE_THRESHOLD_PIXELS = 0.0;
const PROMPT_SPACING = 12.0;
const PROMPT_SPACE_THRESHOLD = 4.0;

export function PromptLayoutManager({prompts, promptLocations, marginX, newPromptId, clearNewPrompt}: PromptLayoutManagerProps) {
    const dispatch = useAppDispatch();
    const [boundingBoxes, setBoundingBoxes] = useState<PromptBoundingBoxes>({});
    const [promptRuns, setPromptRuns] = useState<string[][]>(Object.entries(prompts).map(([id, _]) => [id]));
    const [localPromptLocations, setLocalPromptLocations] = useState<{ [id: string]: PromptLocation}>({});
    const [bulkSaves, setBulkSaves] = useState<Set<string>>(new Set());

    const updateBoundingBoxes = function(id: string, boundingBox: PromptAbsoluteLocation){
        boundingBoxes[id] = boundingBox;
        setBoundingBoxes({...boundingBoxes});
    };

    useEffect(() => {
        if (Object.keys(boundingBoxes).length === Object.keys(prompts).length){
            const sortedIds = Object.entries(boundingBoxes).sort((a, b) => compareDOMy(a[1], b[1])).map((a) => a[0]);
            const startId = sortedIds[0];
            const runs: string[][] = [[startId]];
            var currRunStartIdx = 0;
            // Pass 1 - create bulk runs for overlapping bounding boxes of non-saved elements
            // TODO: compute width and use adjusted position instead
            for(var i = 0; i < sortedIds.length - 1; i++){
                const nextId = sortedIds[i + 1];
                // The bottom of the bounding box of the current run
                const currBottom = boundingBoxes[runs[currRunStartIdx][0]].bottom;
                // The top ot the bounding box being evaluated for merge
                const nextTop = boundingBoxes[nextId].top;
                if (prompts[nextId].isSaved && !bulkSaves.has(nextId)){
                    // Saved elements not in the bulk saved state are not eligible for bulk prompts, Add to its own run
                    currRunStartIdx += 1;
                    runs[currRunStartIdx] = [nextId];
                } else if (nextTop < currBottom - MERGE_THRESHOLD_PIXELS){
                    // Lookback - add to current run if the run is eligible for merge (is not a saved prompt or in the bulk queue)
                    if (!prompts[runs[currRunStartIdx][0]].isSaved || bulkSaves.has(runs[currRunStartIdx][0])){
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
    }, [boundingBoxes, prompts, bulkSaves, promptLocations]);

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
                    >
                        <PromptBox
                            prompt={prompt}
                            savePrompt={() => 
                                dispatch(savePrompt(id))
                            }
                            updatePromptFront={(newPrompt) =>
                                dispatch(updatePromptFront([id, newPrompt]))
                            }
                            updatePromptBack={(newPrompt) =>
                                dispatch(updatePromptBack([id, newPrompt]))
                            }
                            setFullBoundingBox={(box) => updateBoundingBoxes(id, box)}
                            computeFullBoundingBox={boundingBoxes[id] === undefined}
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
                        <div
                            key={id}
                            css={{
                                position: "absolute",
                                left: marginX,
                                top: localPromptLocations[id]?.top,
                            }}
                        >
                            <PromptBox
                                prompt={prompts[id]}
                                isNew={id === newPromptId}
                                savePrompt={() => 
                                    dispatch(savePrompt(id))
                                }
                                updatePromptFront={(newPrompt) =>
                                    dispatch(updatePromptFront([id, newPrompt]))
                                }
                                updatePromptBack={(newPrompt) =>
                                    dispatch(updatePromptBack([id, newPrompt]))
                                }
                                clearNew={clearNewPrompt}
                            />
                        </div>
                    )
                } else {
                    return ( 
                        <div
                            key={ids.join()}
                            css={{
                                position: "absolute",
                                left: marginX,
                                top: localPromptLocations[ids[0]]?.top,
                            }}
                        >
                            <BulkPromptBox
                                prompts={ids.map((id) => prompts[id])}
                                ids={ids}
                                saveAll={() => console.error("UNIMPLEMENTED")}
                                savePrompt={(id) => 
                                    dispatch(savePrompt(id))
                                }
                                addToSaves={(id) => setBulkSaves(new Set(bulkSaves.add(id)))}
                                clearSaves={() => setBulkSaves(new Set())}
                            />
                        </div>
                    )
                }
            })
        }
        </>
    )
}
