import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { MediaType, Module } from "../../ui/components/media/media-type.enum";

@Injectable({ providedIn: 'root' })
export class AttachmentService {
    private readonly API_URL = `${environment.apiUrl}`;

    constructor(private http: HttpClient) { }

    uploadAttachment(module: Module, type: MediaType, refId: number, files: File[]): Observable<any> {
        const url = `${this.API_URL}/Attachments`;
        const formData = new FormData();
        formData.append('module', module.toString());
        formData.append('type', type.toString());
        formData.append('refId', refId.toString());
        for (const file of files) {
            formData.append('file', file);
        }
        return this.http.post(url, formData);
    }
}
