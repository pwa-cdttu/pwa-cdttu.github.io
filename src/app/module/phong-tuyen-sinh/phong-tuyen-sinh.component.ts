import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { AfterViewChecked, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AdmissionsOfficeService } from 'src/app/shared/service/admissions-office/admissions-office.service';
import { ViewMissionService } from 'src/app/shared/service/view-mission/view-mission.service';

@Component({
  selector: 'app-phong-tuyen-sinh',
  templateUrl: './phong-tuyen-sinh.component.html',
  styleUrls: ['./phong-tuyen-sinh.component.scss']
})
export class PhongTuyenSinhComponent implements OnInit, AfterViewChecked {
  menu = [
    {
      key: 'diem-danh',
      url: 'diem-danh',
      icon: 'receipt_long',
      label: 'Điểm danh',
      toolTip: 'Điểm danh',
    }
  ]
  viewPortMode: any;
  isActiveAdmissionOffice: boolean = false;

  constructor(
    public viewMissionService: ViewMissionService,
    private breakpointObserver: BreakpointObserver,
    public admissionsOfficeService: AdmissionsOfficeService
  ) {
  }

  ngAfterViewChecked(): void {
    this.isActiveAdmissionOffice = this.admissionsOfficeService.isActiveAdmissionOffice
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(max-width: 600px)'])
      .subscribe((state: BreakpointState) => {
        const localStorageIsDrawerOpened = JSON.parse(localStorage.getItem('layout') || '{}')
        if (state.matches) {
          this.viewPortMode = 'mobile';
          this.viewMissionService.isDrawerOpened = false;
        } else {
          this.viewPortMode = 'desktop';
          if (localStorageIsDrawerOpened.isDrawerOpened !== undefined) {
            this.viewMissionService.isDrawerOpened = localStorageIsDrawerOpened.isDrawerOpened;
          } else {
            this.viewMissionService.isDrawerOpened = true;
            localStorage.setItem('layout', JSON.stringify({ isDrawerOpened: true }))
          }
        }
      });
  }

  onToggleDrawer() {
    if (this.viewPortMode == 'mobile') {
      this.viewMissionService.isDrawerOpened =
        !this.viewMissionService.isDrawerOpened;
      localStorage.setItem('layout', JSON.stringify({ isDrawerOpened: this.viewMissionService.isDrawerOpened }))
    }
  }
}
