import React, { useEffect, useState } from "react";
import { PromptsState, savePrompt, updatePromptBack, updatePromptFront, } from "../../app/promptSlice";
import { PromptLocation } from "../../util/resolvePromptLocations";
import { useAppDispatch } from "../../app/store";
import PromptBox from "./PromptBox";
import BulkPromptBox from "./BulkPromptBox";

export interface PromptLayoutManagerProps {
    prompts: PromptsState,
    promptLocations: { [id: string]: PromptLocation };
    marginX: number;
    newPromptId?: string;
}

type PromptBoundingBoxes = { [id: string]: DOMRect}

function compareDOMy(a: DOMRect, b: DOMRect): number {
    if (a.top > b.top) return 1;
    else if (a.top < b.top) return -1;
    else return 0;
}

const MERGE_THRESHOLD_PIXELS = 0.0;

export function PromptLayoutManager({prompts, promptLocations, marginX, newPromptId}: PromptLayoutManagerProps) {
    const dispatch = useAppDispatch();
    const [boundingBoxes, setBoundingBoxes] = useState<PromptBoundingBoxes>({});
    const [promptRuns, setPromptRuns] = useState<string[][]>(Object.entries(prompts).map(([id, _]) => [id]));

    const updateBoundingBoxes = function(id: string, boundingBox: DOMRect){
        boundingBoxes[id] = boundingBox;
        setBoundingBoxes({...boundingBoxes});
    };

    useEffect(() => {
        if (Object.keys(boundingBoxes).length === Object.keys(prompts).length){
            const boundingBoxesArr = Object.entries(boundingBoxes);
            boundingBoxesArr.sort((a, b) => compareDOMy(a[1], b[1]));
            const runs: string[][] = [[boundingBoxesArr[0][0]]];
            var currRunStartIdx = 0;
            for(var i = 0; i < boundingBoxesArr.length - 1; i++){
                const currBottom = boundingBoxesArr[i][1].bottom;
                const nextTop = boundingBoxesArr[i + 1][1].top;
                if (nextTop < currBottom - MERGE_THRESHOLD_PIXELS){
                    runs[currRunStartIdx].push(boundingBoxesArr[i + 1][0]);
                } else {
                    currRunStartIdx += 1;
                    runs[currRunStartIdx] = [boundingBoxesArr[i + 1][0]];
                }
            }
            setPromptRuns(runs);
        }
    }, [boundingBoxes]);

    return (
        <>
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
                                top: promptLocations[id]?.top,
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
                                setFullBoundingBox={(box) => updateBoundingBoxes(id, box)}
                                computeFullBoundingBox={boundingBoxes[id] === undefined}
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
                                top: promptLocations[ids[0]]?.top,
                            }}
                        >
                            <BulkPromptBox
                                prompts={ids.map((id) => prompts[id])}
                                ids={ids}
                                saveAll={() => console.error("UNIMPLEMENTED")}
                            />
                        </div>
                    )
                }
            })
        }
        </>
    )
}
