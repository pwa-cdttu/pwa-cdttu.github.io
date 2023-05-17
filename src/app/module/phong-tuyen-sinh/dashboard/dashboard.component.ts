import { trigger, state, style, transition, animate } from '@angular/animations';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { AdmissionsOfficeService } from 'src/app/shared/service/admissions-office/admissions-office.service';
import * as CryptoJS from 'crypto-js';
import { NgxCaptureService } from 'ngx-capture';
import { tap } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class DashboardComponent implements OnInit {

  studentSetingGetting: boolean = false
  downloading: boolean = false
  studentSettings = <any>[]
  viewPortMode: any;
  dataSource = <any>[]
  columnsToDisplay = ['id', 'na', 'bi'];
  columnsToDisplayWithExpand = [...this.columnsToDisplay, 'expand'];
  expandedElement: any | null;

  constructor(
    private admissionsOfficeService: AdmissionsOfficeService,
    private breakpointObserver: BreakpointObserver,
    private captureService: NgxCaptureService,
    private cd: ChangeDetectorRef
  ) {

  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 600px)'])
      .subscribe((state: BreakpointState) => {
        if (state.matches) {
          this.viewPortMode = 'mobile';
        } else {
          this.viewPortMode = 'desktop';
        }
      });
    this.getStudentSettings()
  }

  getStudentSettings() {
    this.studentSetingGetting = true
    try {
      this.admissionsOfficeService.getStudentSettings()
        .subscribe((res: any) => {
          if (res.code == 200) {
            this.studentSettings = res.data
            this.dataSource = new MatTableDataSource(this.studentSettings)
          }
        })
    } catch (error) {
      console.error(error);
      this.studentSetingGetting = false
    }
  }
  private convertBase64ToBlob(Base64Image: string) {
    // split into two parts
    const parts = Base64Image.split(";base64,")
    // hold the content type
    const imageType = parts[0].split(":")[1]
    // decode base64 string
    const decodedData = window.atob(parts[1])
    // create unit8array of size same as row data length
    const uInt8Array = new Uint8Array(decodedData.length)
    // insert all character code into uint8array
    for (let i = 0; i < decodedData.length; ++i) {
      uInt8Array[i] = decodedData.charCodeAt(i)
    }
    // return blob image after conversion
    return new Blob([uInt8Array], { type: imageType })
  }

  generaToken(data: any) {
    const base64url = (source: any) => {
      let encodedSource = CryptoJS.enc.Base64.stringify(source);
      encodedSource = encodedSource.replace(/=+$/, '');
      encodedSource = encodedSource.replace(/\+/g, '-');
      encodedSource = encodedSource.replace(/\//g, '_');
      return encodedSource;
    }
    const header = {
      "alg": "HS256",
      "typ": "JWT"
    };
    const stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
    const encodedHeader = base64url(stringifiedHeader);
    const stringifiedData = CryptoJS.enc.Utf8.parse(JSON.stringify(data));
    const encodedData = base64url(stringifiedData);
    const signature = CryptoJS.HmacSHA512("cdttudata", "cdttukey").toString();
    const encodedSignature = btoa(signature);
    const token = `${encodedHeader}.${encodedData}.${encodedSignature}`;
    return token
  }

  onExpand(element: any, $event: MouseEvent) {
    element['qr'] = this.generaToken({ id: element.id, na: element.na, bi: element.bi })
    setTimeout(() => {
      this.expandedElement =
        this.expandedElement === element ? null : element;
    }, 100)
  }

  saveAsImage(element: any) {
    setTimeout(() => {
      this.downloading = true
      const saveItem = document.getElementById(`QR${element['id']}`)
      this.captureService
        //@ts-ignore
        .getImage(saveItem, true)
        .pipe(
          tap((img) => {
            // converts base 64 encoded image to blobData
            let blobData = this.convertBase64ToBlob(img)
            // saves as image
            const blob = new Blob([blobData], { type: "image/png" })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            // name of the file
            link.download = `QR${element.id}`
            link.click()
            this.downloading = false
          })
        )
        .subscribe();
    }, 0)
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }
}
