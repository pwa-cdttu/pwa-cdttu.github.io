import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PhongTuyenSinhComponent } from './phong-tuyen-sinh.component';
import { DiemDanhComponent } from './diem-danh/diem-danh.component';
import { DashboardComponent } from './dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: PhongTuyenSinhComponent,
    children: [
      {
        path: '',
        component: DashboardComponent
      },
      {
        path: 'diem-danh',
        component: DiemDanhComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PhongTuyenSinhRoutingModule { }
