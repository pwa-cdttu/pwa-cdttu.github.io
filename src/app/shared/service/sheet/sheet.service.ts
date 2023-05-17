import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { read, utils } from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class SheetService {

  constructor(private http: HttpClient) {
  }

  getStudents() {
    const sheetUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vTqzo_b5zyBQKf80PoDIpsisF1iYcZJnpdsAFZE4mJ6E2OKsGMxHh3BbNEKwACmQ3O148eIpqlsZgOJ/pub?output=xlsx`;
    return new Observable((observable) => {
      fetch(sheetUrl)
        .then((res: any) => res.arrayBuffer())
        .then((req => {
          const workbook = read(req)
          const setting = workbook.Sheets['setting']
          const column = [...new Set(Object.keys(setting).map((col: any) => setting[col.replace(/\d+((.|,)\d+)?/, '2')]['v']))]?.filter((col: any) => !!col)
          const data = utils.sheet_to_json<any>(setting, {
            header: column
          })?.slice(2);
          observable.next(data)
          observable.complete()
        }))
    })
  }
}
