export interface FieldDef<K extends string = string> {
    key: K;
    defKey: string;
    label: string;
    mandatory: boolean;
}