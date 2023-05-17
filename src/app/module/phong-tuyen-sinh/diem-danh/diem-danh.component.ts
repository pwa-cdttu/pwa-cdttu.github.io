import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { JwtHelperService } from '@auth0/angular-jwt';
import { DatePipe } from '@angular/common';
import { AdmissionsOfficeService } from 'src/app/shared/service/admissions-office/admissions-office.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-diem-danh',
  templateUrl: './diem-danh.component.html',
  styleUrls: ['./diem-danh.component.scss']
})
export class DiemDanhComponent implements OnInit {
  qrData: any;
  horizontalPosition: MatSnackBarHorizontalPosition = 'center';
  verticalPosition: MatSnackBarVerticalPosition = 'bottom';
  durationInSeconds = 3;
  journeyUser: any = null;
  @ViewChild('welcomeDialog') welcomeDialog!: any;
  @ViewChild('confirmDeleteDialog') confirmDeleteDialog!: any;
  @ViewChild('syncDataDialog') syncDataDialog!: any;
  @ViewChild('addNewDialog') addNewDialog!: any;
  welcomeDialogRef: any
  confirmDeleteDialogRef: any
  welcomeIcon: any
  isDuplicate: boolean = true;
  studentSetingGetting: boolean = false
  isSyncInProgress: boolean = false
  isSyncCheck: boolean = false
  timeout = 3000
  viewPortMode: any;
  jwtHelper = new JwtHelperService()
  studentSettings = <any>[]
  count = <any>[]
  addNew = <any>{}
  checkInSession = <any>{}
  subjectList = <any>[]
  checkInTimeList = <any>[]

  constructor(
    private _snackBar: MatSnackBar,
    public matDialog: MatDialog,
    private cd: ChangeDetectorRef,
    private breakpointObserver: BreakpointObserver,
    private admissionsOfficeService: AdmissionsOfficeService,
    private datePipe: DatePipe
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
    this.getSubject()
  }

  getSubject() {
    try {
      this.admissionsOfficeService.getSubject()
        .subscribe((res: any) => {
          if (res.code == 200) {
            this.subjectList = res.data;
            const localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')?.map((item: any) => {
              return {
                id: item?.subject,
                na: item?.name
              }
            })
            const mergeSubject = [...new Set(localStorageAttendance.map((item: any) => item.id).concat(this.subjectList.map((item: any) => item.id)))]
            mergeSubject.forEach((item: any) => {
              const foundRemote = this.subjectList.find((sl: any) => sl.id == item)
              if (!foundRemote) {
                const foundLocal = localStorageAttendance.find((sl: any) => sl.id == item)
                if (foundLocal) {
                  this.subjectList.push(foundLocal)
                }
              }
            })
            if (this.subjectList.length == 1) {
              this.checkInSession['subject'] = this.subjectList[0]['id']
              this.getCheckInTimeList()
            }
          }
        })
    } catch (error) {
      console.error(error);
    }
  }

  getCheckInTimeList() {
    try {
      this.checkInTimeList = []
      this.admissionsOfficeService.getSubjectTime(this.checkInSession['subject'])
        .subscribe((res: any) => {
          if (res.code == 200) {
            this.checkInTimeList = res.data;
            if (this.checkInTimeList.length == 1) {
              this.checkInSession['time'] = this.checkInTimeList[0]
              this.getStudentSettings()
            }
          } else {
            let localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
            const currentSubject = localStorageAttendance.find((item: any) => item.subject == this.checkInSession.subject)
            if (currentSubject) {
              this.checkInTimeList = Object.keys(currentSubject)?.filter((item: any) => item !== 'subject' && item !== 'name')
              if (this.checkInTimeList.length == 1) {
                this.checkInSession['time'] = this.checkInTimeList[0]
                this.getStudentSettings()
              }
            }
          }
        })
    } catch (error) {
      console.error(error);
    }
  }

  getStudentSettings() {
    this.studentSetingGetting = true
    try {
      let request = <any>{}
      if (this.checkInSession['subject'] && this.checkInSession['time']) {
        request['subject'] = this.checkInSession['subject']
        request['time'] = this.checkInSession['time']
      }
      this.admissionsOfficeService.getStudentSettings(request)
        .subscribe((res: any) => {
          if (res.code == 200) {
            this.studentSetingGetting = false
            let data = res.data
            const localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
            const foundSubject = localStorageAttendance.find((item: any) => item.subject == this.checkInSession['subject'])
            if (foundSubject) {
              const foundAttendance = foundSubject[this.checkInSession['time']]
              if (foundAttendance?.length > 0) {
                foundAttendance.forEach((fa: any) => {
                  const foundIndex = data.indexOf(data.find((item: any) => item.id == fa.id))
                  data[foundIndex]['checkedIn'] = fa.checkedIn
                })
              }
            }
            this.studentSettings = data
            this.count = {
              checkedIn: this.studentSettings?.filter((item: any) => item?.checkedIn > 0)?.length,
              total: this.studentSettings?.length
            }
          }
        })
    } catch (error) {
      console.error(error);
      this.studentSetingGetting = false
    }

  }

  scanComplete(qrData: any) {
    this.qrData = qrData
    if (this.checkInSession['subject'] && this.checkInSession['time']) {
      this.scanAction()
    }
  }

  scanAction() {
    if (this.qrData) {
      this._snackBar.open(`Đã quét được: ${this.qrData}`, 'Đóng', {
        duration: this.durationInSeconds * 1000,
        horizontalPosition: this.horizontalPosition,
        verticalPosition: this.verticalPosition,
      })
      this.journeyUser = null
      try {
        const decodedToken = this.jwtHelper.decodeToken(this.qrData)
        let userData: any;
        try {
          userData = JSON.parse(decodedToken)
        } catch (e) {
          userData = decodedToken
        }
        if (userData) {
          this.journeyUser = {
            id: userData.id,
            na: userData.na,
            bi: userData.bi,
          }
          this.storeAttendance()
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  storeAttendance() {
    this.welcomeDialogRef?.close();
    const foundData = this.studentSettings?.find((item: any) => item?.id === this.journeyUser?.id).checkedIn
    if (!foundData) {
      this.isDuplicate = false
      this.cd.detectChanges()
      this.welcomeDialogRef?.close();
      this.welcomeDialogRef = this.matDialog.open(this.welcomeDialog)
      const getRandomWelcomeIcon = () => {
        const icon = ["👋", "😉", "🤗", "🙌"]
        const getRandomIntInclusive = (min: any, max: any) => {
          min = Math.ceil(min);
          max = Math.floor(max);
          return Math.floor(Math.random() * (max - min + 1) + min); // The maximum is inclusive and the minimum is inclusive
        }
        return icon[getRandomIntInclusive(0, icon.length - 1)];
      }
      this.welcomeIcon = getRandomWelcomeIcon()
      this.welcomeDialogRef?.afterOpened().subscribe(() => {
        setTimeout(() => {
          this.welcomeDialogRef?.close();
          this.welcomeDialogRef?.close();
          this.journeyUser = null
        }, this.timeout)
      })
    } else {
      this.welcomeDialogRef?.close();
      this.welcomeIcon = "🤔"
      this.isDuplicate = true
      this.welcomeDialogRef = this.matDialog.open(this.welcomeDialog)
      this.welcomeDialogRef?.afterOpened().subscribe(() => {
        setTimeout(() => {
          this.welcomeDialogRef?.close();
          this.welcomeDialogRef?.close();
          this.journeyUser = null
        }, this.timeout)
      })
    }
    if (this.viewPortMode == 'desktop') {
      const scannedUser = document.getElementById(this.journeyUser.id)
      const diemDanhWrapper = document.getElementById('diemDanhWrapper')
      if (diemDanhWrapper && scannedUser) {
        const foundData = this.studentSettings.find((item: any) => item.id == this.journeyUser.id)
        const foundIndex = this.studentSettings.indexOf(foundData)
        this.studentSettings[foundIndex]['checkedIn'] = Date.now()
        diemDanhWrapper.scroll({ top: scannedUser.offsetTop - 36 })
      }
    }
    this.storeToLocalStorage()
  }

  storeToLocalStorage() {
    let localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
    const foundSubject = localStorageAttendance?.find((item: any) => item['subject'] === this.checkInSession.subject)
    let savedObject = <any>{}
    if (foundSubject) {
      localStorageAttendance[localStorageAttendance.indexOf(foundSubject)][this.checkInSession.time] = this.studentSettings?.filter((item: any) => item.checkedIn > 0).map((item: any) => { return { id: item.id, checkedIn: item.checkedIn } })
    } else {
      savedObject['subject'] = this.checkInSession.subject
      savedObject[this.checkInSession.time] = this.studentSettings?.filter((item: any) => item.checkedIn > 0).map((item: any) => { return { id: item.id, checkedIn: item.checkedIn } })
      localStorageAttendance.push(savedObject)
    }
    localStorage.setItem('attendance', JSON.stringify(localStorageAttendance))
    this.count = {
      checkedIn: this.studentSettings?.filter((item: any) => item?.checkedIn > 0)?.length,
      total: this.studentSettings?.length
    }
  }

  onShowDeleteConfirm() {
    this.confirmDeleteDialogRef = this.matDialog.open(this.confirmDeleteDialog)
  }

  confirmDelete() {
    localStorage.removeItem('attendance')
    this.getSubject()
    this.getCheckInTimeList()
    this.getStudentSettings()
  }

  onUpdateCheckInSession(req = <any>{}) {
    if (req['subject']) {
      if (req['subject'] !== 'addNew') {
        this.checkInSession['subject'] = req['subject']['id']
        this.checkInSession['time'] = ''
        this.getCheckInTimeList()
      } else {
        this.addNew.type = { key: 'subject', name: 'môn học' }
        this.matDialog.open(this.addNewDialog, { disableClose: true })
      }
    }
    if (req['time']) {
      this.checkInSession['time'] = ''
      if (req['time'] !== 'addNew') {
        this.checkInSession['time'] = req['time']
        this.getStudentSettings()
      } else {
        this.addNew.type = { key: 'time', name: 'thời gian học' }
        this.addNew.key = this.datePipe.transform(new Date(), 'dd/MM/YYYY')
        this.addNew.value = this.datePipe.transform(new Date(), 'HH:mm')
        this.matDialog.open(this.addNewDialog, { disableClose: true })
      }
    }
  }

  exportFile() {
    try {
      this.admissionsOfficeService.getStudentSettings()
        .subscribe((res: any) => {
          if (res.code == 200) {
            let data = res.data
            const localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
            const foundSubject = localStorageAttendance.find((item: any) => item.subject == this.checkInSession['subject'])
            if (foundSubject) {
              const foundAttendance = foundSubject[this.checkInSession['time']]
              if (foundAttendance?.length > 0) {
                data.forEach((item: any) => {
                  item[`${this.datePipe.transform(this.checkInSession.time, 'dd/MM/YYYY HH:mm:ss')}`] = foundAttendance.find((fa: any) => fa.id == item.id)?.checkedIn || 0
                })
                const header = <any>{}
                header.id = 'Mã học viên'
                header.na = 'Họ và Tên'
                header.bi = 'Năm sinh'
                const keys = <any>{}
                keys.id = 'id'
                keys.na = 'na'
                keys.bi = 'bi'
                keys[`${this.datePipe.transform(this.checkInSession.time, 'dd/MM/YYYY HH:mm:ss')}`] = `${this.datePipe.transform(this.checkInSession.time, 'dd/MM/YYYY HH:mm:ss')}`
                data.unshift(keys)
                data.unshift(header)
              }
            }
            const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data, { skipHeader: true })
            ws['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 20 }]

            /* generate workbook and add the worksheet */
            const wb: XLSX.WorkBook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, this.checkInSession.subject);

            /* save to file */
            XLSX.writeFile(wb, `${this.checkInSession.subject}-${this.checkInSession.time}.xlsx`);
          }
        })
    } catch (error) {
      console.error(error);
    }
  }

  onShowSyncDataDialog() {
    this.isSyncInProgress = false
    this.isSyncCheck = false
    this.matDialog.open(this.syncDataDialog, { disableClose: true })
  }

  syncData() {
    this.isSyncInProgress = true
    try {
      this.admissionsOfficeService.syncData()
        .subscribe((res: any) => {
          if (res.code === 200) {
            this.isSyncInProgress = false
            this.isSyncCheck = true
          }
        })
    } catch (error) {
      console.log(error);
      this.isSyncInProgress = false;
      this.isSyncCheck = false
    }
  }

  storeNewSubject() {
    let localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
    if (this.addNew.type.key == 'subject') {
      this.subjectList.push({
        id: this.addNew.key,
        na: this.addNew.value
      })
      localStorageAttendance.push({
        subject: this.addNew.key,
        name: this.addNew.value
      })
    }
    if (this.addNew.type.key == 'time') {
      const formatnewTime: any = this.datePipe.transform(this.addNew.key, `YYYY/MM/dd ${this.addNew.value}:00`)
      const newTimeLog = new Date(formatnewTime).getTime()
      const currentSubject = localStorageAttendance.find((item: any) => item.subject == this.checkInSession.subject)
      if (!currentSubject) {
        localStorageAttendance.push({
          subject: this.checkInSession.subject
        })
        localStorage.setItem('attendance', JSON.stringify(localStorageAttendance))
        localStorageAttendance = JSON.parse(localStorage.getItem('attendance') || '[]')
        const currentSubject = localStorageAttendance.find((item: any) => item.subject == this.checkInSession.subject)
        localStorageAttendance[localStorageAttendance.indexOf(currentSubject)][newTimeLog] = []
      } else {
        localStorageAttendance[localStorageAttendance.indexOf(currentSubject)][newTimeLog] = []
      }
      this.checkInTimeList.push(newTimeLog)
    }
    localStorage.setItem('attendance', JSON.stringify(localStorageAttendance))
  }
}
