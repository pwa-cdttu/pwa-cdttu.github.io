import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PhongTuyenSinhRoutingModule } from './phong-tuyen-sinh-routing.module';
import { PhongTuyenSinhComponent } from './phong-tuyen-sinh.component';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DiemDanhComponent } from './diem-danh/diem-danh.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { CpQrScannerModule } from "../../component/cp-qr-scanner/cp-qr-scanner.module";
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from "@angular/forms";
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatTableModule } from '@angular/material/table';
import { QRCodeModule } from 'angularx-qrcode';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { NgxMatTimepickerModule } from 'ngx-mat-timepicker';
import { MatCheckboxModule } from '@angular/material/checkbox';


@NgModule({
  declarations: [
    PhongTuyenSinhComponent,
    DiemDanhComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule,
    PhongTuyenSinhRoutingModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    CpQrScannerModule,
    MatMenuModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatSelectModule,
    MatExpansionModule,
    MatGridListModule,
    MatTableModule,
    QRCodeModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgxMatTimepickerModule,
    MatCheckboxModule
  ],
  providers: [
    MatDatepickerModule,
    {
      provide: MAT_DATE_LOCALE, useValue: 'vi-VN'
    }
  ]
})
export class PhongTuyenSinhModule { }
