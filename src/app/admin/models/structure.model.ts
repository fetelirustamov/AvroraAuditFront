export interface StructureDto {
    id?: number;
    status?: number;
    locationCode?: number;
    userCode?: number;
    level?: number;
}

/** Bir mağazanın tam onay zənciri — sıra step-i təyin edir: userCodes[0] → level 1. */
export interface StructureChainDto {
    locationCode: number;
    userCodes: number[];
}

export interface ReplaceStructureChainsDto {
    chains: StructureChainDto[];
}

export interface ChainFailureDto {
    locationCode: number;
    message: string;
}

export interface ReplaceStructureChainsResultDto {
    successCount: number;
    failures: ChainFailureDto[];
}
